// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Private721 is ERC721URIStorage, Ownable {

    string private customName;
    string private customSymbol;
    uint256 public maxSupply;
    uint256 public totalSupply;
    bool private isInitialized;

    constructor() ERC721("", "") {
    }

    function name() public view virtual override returns (string memory) {
        return customName;
    }

    // /**
    //  * @dev See {IERC721Metadata-symbol}.
    //  */
    function symbol() public view virtual override returns (string memory) {
        return customSymbol;
    }

    function init(
        string calldata _name,
        string calldata _symbol,
        uint256 _maxSupply,
        address ownerAddress // Pass owner address explicitly
    ) external {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        customName = _name;
        customSymbol = _symbol;
        maxSupply = _maxSupply;
        _transferOwnership(ownerAddress);
    }

    /// @notice Mint NFT only if the signature matches the creator's pre-approved metadata
    function mintNFT(
        address to,
        string calldata tokenURI
    ) external onlyOwner {
        uint256 tokenId = totalSupply + 1; // Cache in memory
        require(tokenId <= maxSupply, "Max supply reached");

        totalSupply = tokenId; // Store updated totalSupply once
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }

    /// @notice Batch mint NFTs with metadata
    function batchMintNFT(address[] memory recipients, string[] calldata tokenURIs) external onlyOwner {
        uint256 length = recipients.length;
        require(length == tokenURIs.length, "Mismatched inputs");

        uint256 startId = totalSupply; // Cache totalSupply in memory
        uint256 endId = startId + length;

        require(endId <= maxSupply, "Max supply exceeded");

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = ++startId; // Assign from memory
            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            unchecked { i++; } // Gas optimization
        }
        totalSupply = endId; // Store totalSupply only once after loop
    }

}