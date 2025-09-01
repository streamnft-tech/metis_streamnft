// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyERC20 is ERC20 {
    constructor() ERC20('Reward-NFT', "Reward-NFT") {
    }
    function mint(address _to, uint256 _amount) public
    {
        _mint( _to,  _amount);
    }
}