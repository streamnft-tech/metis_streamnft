pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IAccessToken is IERC721 {
    function totalSupply() external view returns (uint);
    function tokenAddress() external view returns (address);
    function tokenId() external view returns (uint256);
    function init(address _tbaAccount, uint256 maxSupply, string calldata _name, string calldata _symbol, string calldata _tokenURI) external;
    function mint(address to) external returns (uint256);
}
