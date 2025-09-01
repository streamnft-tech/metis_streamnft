// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract ERC721Advanced is ERC721URIStorage, Ownable, ReentrancyGuardUpgradeable, ERC2981, EIP712 {

    uint256 public totalSupply;
    uint256 public maxSupply;
    string public baseURI;
    string private customName;
    string private customSymbol;
    address public danTreasury;
    uint16 public maxWalletMint;
    string private constant SIGNING_DOMAIN = "StreamNFT"; // Project-specific domain
    string private constant SIGNATURE_VERSION = "1.0"; // Update when upgrading

    /// @dev Initializes the contract with the correct domain separator for signing
    constructor() ERC721("", "") EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    DropPhase[] public dropPhases;
    mapping(uint256 => PrivateDrop) public privateDrops;
    mapping(address => uint256) public walletMintCount;
    mapping(address => mapping(uint256 => uint256)) public walletMintCountPerDrop;

    /// @notice Structure for minting requests (EIP-712 Typed Data)
    struct MintRequest {
        uint256 tokenId;
        string tokenURI;
    }
    
    struct PrivateDrop{
        address gatedTokenAddress;
        bytes32 merkleRoot;
    }

    struct LaunchpadInput {
        uint96 _royaltyBps;
        DropPhase[] _dropPhases;
        PrivateDrop[] _privateDrops;
        address royaltyAddress;
    }

    struct DropPhase {
        uint80 mintPrice; 
        uint80 mintFee; 
        uint48 startTime; 
        uint48 endTime;
        uint256 maxSupply; 
        uint16 maxWalletMint;
        bool isTokenGated;
        bool isWhitelisted;
    }

    function init(
        string memory  _name,
        string memory  _symbol,
        uint256        _maxSupply,
        address        ownerAddress,
        string calldata _tokenURI,
        address        _danTreasury,
        LaunchpadInput calldata _launchPadInput
    ) external initializer {
        // require(owner() == address(0), "Already initialized");
        __ReentrancyGuard_init();
        customName    = _name;
        customSymbol  = _symbol;
        maxSupply     = _maxSupply;
        baseURI       = _tokenURI;
        danTreasury   = _danTreasury;

        uint256 totalMaxSupply = 0;
        uint256 pdIndex        = 0;
        uint256 numPhases      = _launchPadInput._dropPhases.length;

        // Single pass:
        for (uint256 i = 0; i < numPhases; ) {
            DropPhase calldata phase = _launchPadInput._dropPhases[i];

            require(phase.startTime < phase.endTime, "Time Incorrect");
            totalMaxSupply += phase.maxSupply;

            if (phase.isTokenGated || phase.isWhitelisted) {
                // must have a corresponding PrivateDrop
                require(pdIndex < _launchPadInput._privateDrops.length, "Missing privateDrop");
                privateDrops[i] = _launchPadInput._privateDrops[pdIndex++];
            }

            unchecked { ++i; }
        }
        // Ensure we consumed exactly all the privateDrops
        require(pdIndex == _launchPadInput._privateDrops.length, "Extra privateDrops");
        require(totalMaxSupply <= _maxSupply, "Drop Supply Incorrect");
        // Copy the array pointer — this is a single SSTORE for the whole array
        dropPhases = _launchPadInput._dropPhases;
        _transferOwnership(ownerAddress);
        _setDefaultRoyalty(_launchPadInput.royaltyAddress, _launchPadInput._royaltyBps);
    }

    function mint(address to, uint256 dropIndex, bytes32[] calldata proof, uint256 tokenId, string calldata _tokenURI, bytes calldata signature ) external payable nonReentrant {
        // Verify that the drop index is valid.
        require(dropIndex < dropPhases.length, "Invalid drop index");
        
        address contractOwner = owner(); // Cache owner address

        // Create a structured message hash for verification
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            keccak256("MintRequest(uint256 tokenId,string tokenURI)"),
            tokenId,
            keccak256(bytes(_tokenURI))
        )));

        // Verify signature with ECDSA recovery
        require(contractOwner == ECDSA.recover(digest, signature), "Invalid signature");

        // Load the drop phase data.
        DropPhase memory dropPhase = dropPhases[dropIndex];
        
        // Check that the current time is within the drop window.
        require(block.timestamp >= dropPhase.startTime && block.timestamp <= dropPhase.endTime, "Drop not active");
        
        // Calculate the required payment (mintPrice + mintFee).
        uint256 requiredPayment = uint256(dropPhase.mintPrice) + uint256(dropPhase.mintFee);
        require(msg.value == requiredPayment, "Incorrect payment amount");
        
        // Ensure that the global max supply has not been exceeded.
        require(totalSupply < maxSupply, "Max supply reached");
        
        // Enforce the per-wallet mint limit for this drop.
        if( dropPhase.maxWalletMint !=0){
            require(walletMintCountPerDrop[msg.sender][dropIndex] < dropPhase.maxWalletMint, "Max wallet mint reached for this drop");
        }
        
        // Check for token gating if required.
        if (dropPhase.isTokenGated) {
            // The caller must hold at least one token of the gatedTokenAddress.
            // Note: Make sure the gatedTokenAddress is an ERC721 contract.
            require(ERC721(privateDrops[dropIndex].gatedTokenAddress).balanceOf(msg.sender) > 0, "Not eligible for token gated drop");
        }
        
        // Check for whitelist if required.
         if (dropPhase.isWhitelisted) {
            bytes32 merkleRoot = privateDrops[dropIndex].merkleRoot;
            if (merkleRoot != bytes32(0)) {
                if (MerkleProof.processProofCalldata(proof, keccak256(abi.encodePacked(msg.sender))) != merkleRoot) {
                    revert("Not whitelisted");
                }
            }
        }
        
        // Increase global supply.
        totalSupply++;
        // Update the wallet's minted count for this drop.
        walletMintCountPerDrop[msg.sender][dropIndex]++;
        
        // Mint the token.
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        // (Optional) Handle fee distribution.
        // For example, you might want to forward the mintFee to a treasury.
        (bool success, ) = payable(danTreasury).call{value: uint256(dropPhase.mintFee)}("");
        require(success, "Fee transfer failed");
         (success, ) = payable(contractOwner).call{value: uint256(dropPhase.mintPrice)}("");
        require(success, "Fee transfer failed");
    }

    // function tokenURI(
    //     uint256 tokenId
    // ) public view virtual override returns (string memory) {
    //     require(_exists(tokenId), "Token does not exist");
    //     return baseURI;
    // }

    function name() public view virtual override returns (string memory) {
        return customName;
    }

    // /**
    //  * @dev See {IERC721Metadata-symbol}.
    //  */
    function symbol() public view virtual override returns (string memory) {
        return customSymbol;
    }

    function getFee() external view returns (uint80[] memory mintPrices, uint80[] memory mintFees) {
        uint256 length = dropPhases.length;
        mintPrices = new uint80[](length);
        mintFees = new uint80[](length);
        
        for (uint256 i = 0; i < length; i++) {
            mintPrices[i] = dropPhases[i].mintPrice;
            mintFees[i] = dropPhases[i].mintFee;
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
