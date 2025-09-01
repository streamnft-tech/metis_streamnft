// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ERC1155Advanced is ERC1155, Ownable, ReentrancyGuardUpgradeable, ERC2981 {

    address public danTreasury;
    string private customName;
    string private customSymbol;

    uint256 public flatMintFee;
    uint256 public percentageFee;

    mapping(uint256 => DropPhase[]) public dropPhases;
    mapping(uint256 => mapping(uint256 => PrivateDrop)) public privateDrops; // Phase index => token ID => drop details
    mapping(bytes32 => uint256) public walletMintCountPerDrop; /// maps keccak256(user, dropIndex, tokenId) ⇒ count

    mapping(uint256 => uint256) public maxSupply;
    mapping(uint256 => mapping(uint256 => uint256)) public phaseMinted; // Phase index => token ID => count

    mapping(uint256 => bool) public tokenExists; // Tracks if a token exists
    mapping(uint256 => string) private _tokenURIs; // Token ID => Metadata URI


    struct PrivateDrop {
        address gatedTokenAddress;
        bytes32 merkleRoot;
    }

    struct LaunchpadInput {
        uint96 _royaltyBps;
        DropPhase[] _dropPhases;
        PrivateDrop[] _privateDrops;
    }

    struct DropPhase {
        uint256 maxSupply;     // 32 bytes - Slot 1
        uint80 mintPrice;      // 10 bytes - Slot 2
        uint80 mintFee;        // 10 bytes 
        uint48 startTime;      // 6 bytes
        uint48 endTime;        // 6 bytes - Total: 32 bytes
        uint16 maxWalletMint;  // 2 bytes - Slot 3
        bool isTokenGated;     // 1 byte
        bool isWhitelisted;    // 1 byte
    }

    constructor() ERC1155("") {}

    function init(
        string calldata _name,
        string calldata _symbol,
        address ownerAddress,
        address _danTreasury,
        uint96 _royaltyBps,
        uint256 _flatMintFee,
        uint256 _percentageFee,
        address royaltyAddress
    ) external initializer {
        __ReentrancyGuard_init();
        customName = _name;
        customSymbol = _symbol;
        danTreasury = _danTreasury;
        flatMintFee = _flatMintFee;
        percentageFee = _percentageFee;
        _transferOwnership(ownerAddress);
        _setDefaultRoyalty(royaltyAddress, _royaltyBps);
    }

    function name() public view returns (string memory) {
        return customName;
    }

    function symbol() public view returns (string memory) {
        return customSymbol;
    }

    function createToken(
        uint256 tokenId,
        string calldata _tokenURI,
        LaunchpadInput memory _launchPadInput
    ) external onlyOwner {
        require(!tokenExists[tokenId], "Token already set");

        uint256 totalMaxSupply = 0;
        uint256 pdIndex = 0;
        uint256 numPhases = _launchPadInput._dropPhases.length;

        for (uint256 i = 0; i < numPhases; ) {
            DropPhase memory phase = _launchPadInput._dropPhases[i];
            require(phase.startTime < phase.endTime, "Time Incorrect");
            totalMaxSupply += phase.maxSupply;

            if (phase.isTokenGated || phase.isWhitelisted) {
                require(pdIndex < _launchPadInput._privateDrops.length, "Missing privateDrop");
                privateDrops[tokenId][i] = _launchPadInput._privateDrops[pdIndex++];
            }
            phase.mintFee = uint80(flatMintFee + (percentageFee * phase.mintPrice) / 100);
            unchecked { ++i; }
        }
        require(pdIndex == _launchPadInput._privateDrops.length, "Extra privateDrops");
        dropPhases[tokenId] = _launchPadInput._dropPhases;
        _tokenURIs[tokenId] = _tokenURI;
        maxSupply[tokenId] = totalMaxSupply;
        tokenExists[tokenId] = true;
    }
    error InsufficientFunds(uint provided, uint required);

    function mint(address to, uint256 id, uint256 amount, uint256 dropIndex, bytes32[] calldata proof) external payable nonReentrant {
        require(dropIndex < dropPhases[id].length, "Invalid drop index");

        DropPhase memory dropPhase = dropPhases[id][dropIndex];

        if (!(block.timestamp >= dropPhase.startTime && block.timestamp <= dropPhase.endTime)) {
            revert(string(abi.encodePacked(
                "Drop not active: now=",
                Strings.toString(block.timestamp),
                ", start=",
                Strings.toString(dropPhase.startTime),
                ", end=",
                Strings.toString(dropPhase.endTime)
            )));
        }

        uint256 requiredPayment = (uint256(dropPhase.mintPrice) + uint256(dropPhase.mintFee)) * amount;
        if (msg.value != requiredPayment) {
            revert InsufficientFunds({provided: msg.value, required: requiredPayment});
            // revert ("Invalid Pay Amount");
        }

        require(phaseMinted[id][dropIndex] + amount <= dropPhase.maxSupply, "Max supply reached for this drop");

        if(dropPhase.maxWalletMint!=0){
            if(walletMintCountPerDrop[_mkKey(to,dropIndex,id)] + amount > dropPhase.maxWalletMint){
                revert("Max wallet mint reached for this drop");
            } else {
                walletMintCountPerDrop[_mkKey(to,dropIndex,id)] += amount;
            }
        }

        if (dropPhase.isTokenGated) {
            require(ERC1155(privateDrops[id][dropIndex].gatedTokenAddress).balanceOf(to, id) > 0, "Not eligible for token gated drop");
        }

        if (dropPhase.isWhitelisted) {
            bytes32 merkleRoot = privateDrops[id][dropIndex].merkleRoot;
            if (merkleRoot != bytes32(0)) {
                if (!MerkleProof.verify(proof, merkleRoot, keccak256(abi.encodePacked(to)))) {
                    revert("Not whitelisted");
                }
            }
        }

        phaseMinted[id][dropIndex] += amount;

        _mint(to, id, amount, "");

        (bool success, ) = payable(danTreasury).call{value: uint256(dropPhase.mintFee) * amount}("");
        require(success, "Fee transfer failed");
        (success, ) = payable(owner()).call{value: uint256(dropPhase.mintPrice) * amount}("");
        require(success, "Fee transfer failed");
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _tokenURIs[id];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _mkKey(
        address user,
        uint256 dropIndex,
        uint256 tokenId
    ) internal pure returns (bytes32) {
        // abi.encodePacked packs user (20 bytes), dropIndex (1 byte), tokenId (padded to 32)
        return keccak256(abi.encodePacked(user, dropIndex, tokenId));
    }

    function upsertDropPhase(
        uint256 tokenId,
        uint256 phaseIndex,
        DropPhase calldata newPhase,
        PrivateDrop calldata newPrivateDrop
    ) external onlyOwner {
        require(tokenExists[tokenId], "Token not initialized");
        require(newPhase.startTime < newPhase.endTime, "Invalid time range");
        require(newPhase.startTime > block.timestamp, "Phase already started");

        uint256 oldSupply;
        if (phaseIndex < dropPhases[tokenId].length) {
            // Load existing phase in storage
            DropPhase storage current = dropPhases[tokenId][phaseIndex];
            oldSupply = current.maxSupply;

            // Ensure new maxSupply ≥ already minted
            require(phaseMinted[tokenId][phaseIndex] <= newPhase.maxSupply, 
                    "New maxSupply below minted");

            // Copy each field explicitly from calldata to storage
            current.maxSupply      = newPhase.maxSupply;
            current.mintPrice      = newPhase.mintPrice;
            current.mintFee        = newPhase.mintFee;
            current.startTime      = newPhase.startTime;
            current.endTime        = newPhase.endTime;
            current.maxWalletMint  = newPhase.maxWalletMint;
            current.isTokenGated   = newPhase.isTokenGated;
            current.isWhitelisted  = newPhase.isWhitelisted;

            // Update private drop mapping if needed
            if (newPhase.isTokenGated || newPhase.isWhitelisted) {
                privateDrops[tokenId][phaseIndex] = newPrivateDrop;
            } else {
                delete privateDrops[tokenId][phaseIndex];
            }
        } else {
            // Append new phase
            dropPhases[tokenId].push(newPhase);
            oldSupply = 0;
            if (newPhase.isTokenGated || newPhase.isWhitelisted) {
                privateDrops[tokenId][phaseIndex] = newPrivateDrop;
            }
        }

        // Adjust overall maxSupply
        if (newPhase.maxSupply > oldSupply) {
            maxSupply[tokenId] += (newPhase.maxSupply - oldSupply);
        } else {
            maxSupply[tokenId] -= (oldSupply - newPhase.maxSupply);
        }
    }

}
