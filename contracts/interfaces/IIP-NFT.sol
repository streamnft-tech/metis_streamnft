pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IIP_NFT is IERC721 {
    function totalSupply() external view returns(uint);
    function mint(address to) external returns(uint);
}