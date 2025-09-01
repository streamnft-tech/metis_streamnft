// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/StreamLibrary.sol";

interface ITokenInit {
    
    function init(string memory name, string memory symbol, uint256 maxSupply, address owner) external;

    function init(string memory name, string memory symbol, uint256 maxSupply, address owner, string calldata tokenURI) external;

    //ERC721Public
    function init(string memory name, string memory symbol, uint256 price, uint256 maxSupply, address owner, uint256 mintFee, address danTrasury) external;

    //ERC1155Public
    function init(string memory name, string memory symbol, address owner, uint256 mintFee, uint256 flatMintFee, address danTreasury) external;

    //Passes
    function init(string memory name, string memory symbol, uint256 price, uint256 maxSupply, address owner, string calldata tokenURI, uint256 mintFee, address danTrasury) external;

    //721 Advanced
    function init(string memory name, string memory symbol, uint256 maxSupply, address owner, string calldata tokenURI, address danTreasury, StreamLibrary.LaunchpadInput calldata _launchPadInput) external;

    //1155 Advanced
    function init(string memory name, string memory symbol, address owner, address danTreasury, uint96 _royaltyBps, uint256 flatMintFee, uint256 percentMintFee, address royaltyAddress) external;

}