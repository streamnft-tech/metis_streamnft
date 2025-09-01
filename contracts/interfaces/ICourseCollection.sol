pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ICourseCollection is IERC721 {
    function mintAndName(
        string memory _name, 
        string memory _symbol,
        address to, 
        string[] memory tokenURIs
    ) external;
    function mintBatch(address to, string[] memory tokenURIs) external;
    function totalSupply() external view returns (uint256);
}