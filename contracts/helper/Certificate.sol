// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ERC7066.sol";

interface IAccessManager {
    function getContentExpiry(
        uint256 index,
        address user
    ) external view returns (uint256);
    function getAccessTokenExpiry(
        uint256 index,
        uint256 tokenId
    ) external view returns (uint256);
}

contract Ed3Certificate is ERC7066 {
    uint256 public totalSupply;
    address public accessManager;
    uint256 public maxSupply;
    string public baseURI;
    uint256 public contentIndex;
    string private customName;
    string private customSymbol;
    bool private isInitialized;
    address public accessCollection;

    constructor() ERC721("certi1", "certi1") {}

    function init(
        string calldata _name,
        string calldata _symbol,
        uint256 _maxSupply,
        string calldata _tokenURI,
        uint256 _contentIndex,
        address _accessCollection
    ) external {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        customName = _name;
        customSymbol = _symbol;
        accessManager = msg.sender;
        maxSupply = _maxSupply;
        baseURI = _tokenURI;
        contentIndex = _contentIndex;
        accessCollection = _accessCollection;
    }

    function mintCertificate() external {
        uint256 newSupply = totalSupply + 1; // Store in memory
        require(newSupply <= maxSupply, "Max Supply Reached");
        require(accessCollection == address(0), "Invalid Access Type Mint");

        uint256 expiry = IAccessManager(accessManager).getContentExpiry(
            contentIndex,
            msg.sender
        );
        require(balanceOf(msg.sender) == 0, "Already Minted");
        require(expiry > 0, "Content Not Purchased");

        totalSupply = newSupply; // Update storage once
        _mint(msg.sender, newSupply);
        _lock(newSupply, address(this));
    }

    function mintCertificateForAccessToken(uint256 tokenId) external {
        uint256 newSupply = totalSupply + 1; // Store in memory
        require(newSupply <= maxSupply, "Max Supply Reached");

        require(accessCollection != address(0), "Invalid Access Type Mint");

        require(msg.sender==IERC721(accessCollection).ownerOf(tokenId),"Content Not Purchased");
        uint256 expiry = IAccessManager(accessManager).getAccessTokenExpiry(
            contentIndex,
            tokenId
        );
        require(balanceOf(msg.sender) == 0, "Already Minted");
        require(expiry > 0, "Content Not Purchased");

        totalSupply = newSupply; // Update storage once
        _mint(msg.sender, newSupply);
        _lock(newSupply, address(this));
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return baseURI;
    }

    function name() public view virtual override returns (string memory) {
        return customName;
    }

    // /**
    //  * @dev See {IERC721Metadata-symbol}.
    //  */
    function symbol() public view virtual override returns (string memory) {
        return customSymbol;
    }

}
