// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import '../libraries/ERC7066.sol';

contract ERC7066Sakle is ERC7066{
    uint256 public minted;
    constructor()ERC721("StreamNFT Pioneers: The Cryptocore Quest","STRMP"){}

    function _baseURI() internal view virtual override  returns (string memory) {
        return "";
    }

    function mint(uint256 from, uint256 to, address _to) public{
        for(uint256 id=from;id<to;id++){
            _mint(_to,id);
            minted++;
        }
    }
}