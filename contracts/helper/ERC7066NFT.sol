// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import '../libraries/ERC7066.sol';

contract ERC7066NFT is ERC7066{
    uint public totalSupply;
    constructor()ERC721("ERC7066-NFT","ERC7066-NFT"){}

    function mint(address _to) public{
        _mint(_to,totalSupply);
        totalSupply++;
    }
}