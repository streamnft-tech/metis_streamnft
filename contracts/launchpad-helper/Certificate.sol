// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ERC7066.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Certificate is ERC7066, Ownable {
    uint256 public totalSupply;
    uint256 public maxSupply;
    string public baseURI;
    string private customName;
    string private customSymbol;

    constructor() ERC721("certi1", "certi1") {}

    function init(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        address ownerAddress,
        string calldata _tokenURI
    ) external {
        require(owner() == address(0), "Already initialized"); // Ensure init can only be called once
        customName = _name;
        customSymbol = _symbol;
        maxSupply = _maxSupply;
        baseURI=_tokenURI;
        _transferOwnership(ownerAddress);
    }

    function mint(address to) external onlyOwner {
        uint256 tokenId = totalSupply + 1; // Store in memory
        require(tokenId <= maxSupply, "Max Supply Reached");

        totalSupply = tokenId; // Store updated totalSupply once
        _mint(to, tokenId);
        _lock(tokenId, address(0));
    }

    function batchMint(address[] calldata recipients) external onlyOwner {
        uint256 length = recipients.length;
        uint256 _totalSupply = totalSupply; // Cache totalSupply in memory
        require(_totalSupply + length <= maxSupply, "Max supply exceeded");

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = ++_totalSupply; // Increment cached totalSupply
            _mint(recipients[i], tokenId);
            _lock(tokenId, address(0));
            unchecked { i++; } // Gas optimization
        }

        totalSupply = _totalSupply; // Store totalSupply only once after the loop
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return baseURI;
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
