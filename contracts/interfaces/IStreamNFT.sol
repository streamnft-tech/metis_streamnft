// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "./IERC7066.sol";

interface IStreamNFT is IERC7066{

    function mint(address to, string memory uri) external;

    function updateOwner(address owner) external;

    function getTotalSupply() external view returns(uint256);
}