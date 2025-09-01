// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Nft is ERC1155 {
    uint256 public totalSupply;
    
    constructor() ERC1155("hiii") {}

    function mint(address _to, uint256 _amount) public {
        totalSupply += _amount;
        _mint(_to, 0, _amount, "");
    }

    function setApprovalForAll(address operator, bool approved) public override{
        super.setApprovalForAll(operator,approved);
    }

     function uri(uint256 id) public view override returns(string memory){
        return super.uri(id);
    }
}