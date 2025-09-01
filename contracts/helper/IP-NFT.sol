pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IP_NFT is ERC721, Ownable {
    uint256 totalSupply;

    constructor(string memory _name, string memory _symbol, address _owner) ERC721(_name, _symbol) {
        _transferOwnership(_owner);
    }

    function mint(address to) public onlyOwner returns (uint256 tokenId) {
        tokenId = totalSupply + 1; // Use memory variable
        totalSupply = tokenId; // Update storage once
        _mint(to, tokenId);
    }
}