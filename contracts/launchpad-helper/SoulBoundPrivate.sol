// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ERC7066.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulBoundPrivate is ERC7066, Ownable {
    mapping(uint256 => string) private _tokenURIs;
    uint256 public totalSupply;
    uint256 public maxSupply;
    string public baseURI;
    string private customName;
    string private customSymbol;
    bool private isInitialized;

    constructor() ERC721("certi1", "certi1") {}

    function init(
        string memory _name,
        string memory _symbol,
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

    function mint(address to, string calldata _tokenURI) external onlyOwner {
        require(totalSupply < maxSupply, "Max Supply Reached");
        uint256 tokenId = ++totalSupply; // Cache totalSupply in memory
        _mint(to, tokenId);
        _tokenURIs[tokenId] = _tokenURI;
        _lock(tokenId, address(0));
    }

    function batchMint(address[] calldata recipients, string[] calldata tokenURIs) external onlyOwner {
        uint256 length = recipients.length;
        require(length == tokenURIs.length, "Mismatched recipients and URIs");

        uint256 _totalSupply = totalSupply; // Cache totalSupply in memory
        require(_totalSupply + length <= maxSupply, "Max supply exceeded");

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = ++_totalSupply; // Increment cached supply
            _mint(recipients[i], tokenId);
            _tokenURIs[tokenId] = tokenURIs[i];
            _lock(tokenId, address(0));
            unchecked { i++; } // Gas optimization
        }
        totalSupply = _totalSupply; // Store totalSupply once after loop
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenURIs[tokenId];
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

}
