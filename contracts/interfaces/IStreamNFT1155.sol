// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "./IERC7066SFT.sol";

interface IStreamNFT1155 is IERC7066SFT{

    function mint(address to, string memory uri, uint256 amount) external;

    function mintExistingId(address to, uint256 id, uint256 amount) external;

    function updateOwner(address owner) external;

    function getTotalSupply() external view returns(uint256);
}