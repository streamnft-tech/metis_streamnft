// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Private1155 is ERC1155, Ownable {

    string private customName;
    string private customSymbol;

    mapping(uint256 => string) private _tokenURIs; // Token ID => Metadata URI
    mapping(uint256 => bool) public tokenExists; // Tracks if a token exists

    mapping(uint256 => uint256) public maxSupply; // Max supply per token ID
    mapping(uint256 => uint256) public totalSupply; // Token ID => Total Minted
    bool private isInitialized;

    constructor() ERC1155('') Ownable() {}

    function uri(uint256 id) public view override returns (string memory) {
        return _tokenURIs[id];
    }

    function name() public view returns (string memory) {
        return customName;
    }

    function symbol() public view returns (string memory) {
        return customSymbol;
    }

    function init(
        string calldata _name,
        string calldata _symbol,
        address ownerAddress // Pass owner address explicitly
    ) external {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        customName = _name;
        customSymbol = _symbol;
        _transferOwnership(ownerAddress);
    }

    /// @notice Set max supply for a token ID (Only Owner)
    function setToken(uint256 id, string calldata _tokenURI, uint256 supply) external onlyOwner {
        require(!tokenExists[id], "Token already set");

        maxSupply[id] = supply;
        _tokenURIs[id] = _tokenURI;
        tokenExists[id] = true;
    }

    function mint(address account, uint256 id, uint256 amount, bytes calldata data)
        public
        onlyOwner
    {
        require(tokenExists[id], "Token does not exist");
        uint256 supply = totalSupply[id]; // Cache total supply
        uint256 max = maxSupply[id]; // Cache max supply
        require(supply + amount <= max, "Max supply reached");
        _mint(account, id, amount, data);
        totalSupply[id] = supply + amount; // Update storage only once
    }

    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data)
        public
        onlyOwner
    {
        uint256 length = ids.length;
        require(length == amounts.length, "Mismatched IDs and amounts");

        for (uint256 i = 0; i < length; ) {
            uint256 id = ids[i]; // Cache ID in memory
            uint256 amount = amounts[i]; // Cache amount in memory
            require(tokenExists[id], "Token does not exist");

            uint256 currentSupply = totalSupply[id]; // Cache totalSupply in memory
            uint256 max = maxSupply[id]; // Cache maxSupply in memory

            require(currentSupply + amount <= max, "Max supply exceeded");

            totalSupply[id] = currentSupply + amount; // Write to storage only once per token ID
            unchecked { i++; } // Gas optimization
        }

        _mintBatch(to, ids, amounts, data); // Mint after updating total supply
    }
}

