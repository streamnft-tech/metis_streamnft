// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract CommonNFT is ERC721{
    // uint public totalSupply;
    constructor()ERC721("CNFT","CNFT"){}

    function mint(address _to, uint256 tokenId) public{
        _mint(_to,tokenId);
        // totalSupply++;
    }

    function _baseURI() internal pure override(ERC721) returns (string memory) {
        return "hiii";
    }
}