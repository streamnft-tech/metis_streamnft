// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEd3Certificate{
    function totalSupply() external view returns (uint256);
    function accessManager() external view returns (address);
    function maxSupply() external view returns (uint256);
    function baseURI() external view returns (string memory);
    function contentIndex() external view returns (uint256);
    function customName() external view returns (string memory);
    function customSymbol() external view returns (string memory);
    function init(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        string memory customURI,
        uint256 _contentIndex,
        address _accessCollection
    ) external;
}