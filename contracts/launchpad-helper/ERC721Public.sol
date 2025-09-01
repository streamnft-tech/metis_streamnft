// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Public721 is ERC721URIStorage, Ownable, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    string private customName;
    string private customSymbol;
    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public mintFee;
    bool private isInitialized;
    address public danTreasury;
    string private constant SIGNING_DOMAIN = "StreamNFT"; // Project-specific domain
    string private constant SIGNATURE_VERSION = "1.0"; // Update when upgrading

    /// @dev Initializes the contract with the correct domain separator for signing
    constructor() ERC721("", "") EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    function name() public view virtual override returns (string memory) {
        return customName;
    }

    function symbol() public view virtual override returns (string memory) {
        return customSymbol;
    }

    /// @notice Initializes the contract with collection details, only callable once
    function init(
        string calldata _name,
        string calldata _symbol,
        uint256 price,
        uint256 _maxSupply,
        address ownerAddress,
        uint256 _mintFee,
        address _danTreasury
    ) external {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        customName = _name;
        customSymbol = _symbol;
        mintPrice = price;
        maxSupply = _maxSupply;
        mintFee = _mintFee;
        danTreasury = _danTreasury;
        _transferOwnership(ownerAddress);
    }

    /// @notice Structure for minting requests (EIP-712 Typed Data)
    struct MintRequest {
        uint256 tokenId;
        string tokenURI;
    }

    /// @notice Mint NFT only if the signature matches the creator's pre-approved metadata
    function mintNFT(
        uint256 tokenId,
        string calldata tokenURI,
        bytes calldata signature
    ) external payable nonReentrant{
        require(msg.value == mintPrice + mintFee, "Incorrect payment");
        require(tokenId <= maxSupply, "Max supply reached");

        address contractOwner = owner(); // Cache owner address

        // Create a structured message hash for verification
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            keccak256("MintRequest(uint256 tokenId,string tokenURI)"),
            tokenId,
            keccak256(bytes(tokenURI))
        )));

        // Verify signature with ECDSA recovery
        require(contractOwner == ECDSA.recover(digest, signature), "Invalid signature");

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        (bool success, ) = payable(danTreasury).call{value: mintFee}("");
        require(success, "Payment transfer failed");

        // Transfer mint payment to the contract owner
        (success, ) = payable(contractOwner).call{value: mintPrice}("");
        require(success, "Payment transfer failed");
    }
}