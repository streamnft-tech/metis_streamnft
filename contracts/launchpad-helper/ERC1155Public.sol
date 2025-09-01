// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Public1155 is ERC1155, Ownable, ReentrancyGuard {
    string private customName;
    string private customSymbol;
    uint256 public mintFee;
    uint256 public flatMintFee;
    address public danTreasury;

    mapping(uint256 => string) private _tokenURIs; // Token ID => Metadata URI
    mapping(uint256 => uint256) public mintPrice; // Mint price per token ID
    mapping(uint256 => bool) public tokenExists; // Tracks if a token exists
    mapping(uint256 => uint256) public totalSupply; // Token ID => Total Minted
    mapping(uint256 => uint256) public maxSupply; // Max supply per token ID
    bool private isInitialized;

    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount);

    constructor() ERC1155("") {}

    /// @notice Returns the metadata URI of a token ID
    function uri(uint256 id) public view override returns (string memory) {
        require(tokenExists[id], "Token does not exist");
        return _tokenURIs[id];
    }

    function name() public view returns (string memory) {
        return customName;
    }

    function symbol() public view returns (string memory) {
        return customSymbol;
    }
    
    /// @notice Initializes the contract (Only Callable Once)
    function init(
        string calldata _name,
        string calldata _symbol,
        address ownerAddress,
        uint256 _mintFee,
        uint256 _flatMintFee,
        address _danTreasury
    ) external {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_symbol).length > 0, "Symbol cannot be empty");
        require(ownerAddress != address(0), "Owner address cannot be zero");

        customName = _name;
        customSymbol = _symbol;
        mintFee = _mintFee;
        flatMintFee = _flatMintFee;
        danTreasury = _danTreasury;
        _transferOwnership(ownerAddress);
    }

    /// @notice Set token metadata & price (Off-Chain Storage)
    function setToken(
        uint256 tokenId,
        string calldata _tokenURI,
        uint256 _maxSupply,
        uint256 price
    ) external onlyOwner {
        require(!tokenExists[tokenId], "Token already set");

        _tokenURIs[tokenId] = _tokenURI;
        maxSupply[tokenId] = _maxSupply;
        mintPrice[tokenId] = price;
        tokenExists[tokenId] = true;
    }

    function batchSetToken(
        uint256[] calldata tokenIds,
        string[] calldata tokenURIs,
        uint256[] calldata maxSupplies,
        uint256[] calldata prices
    ) external onlyOwner {
        uint256 length = tokenIds.length;
        require(
            length == tokenURIs.length &&
            length == maxSupplies.length &&
            length == prices.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < length; i++) {
            require(!tokenExists[tokenIds[i]], "Token already set");
            _tokenURIs[tokenIds[i]] = tokenURIs[i];
            maxSupply[tokenIds[i]] = maxSupplies[i];
            mintPrice[tokenIds[i]] = prices[i];
            tokenExists[tokenIds[i]] = true;
        }
    }

    /// @notice Mint a single ERC1155 token
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external payable nonReentrant{
        require(tokenExists[id], "Token does not exist");

        uint256 supply = totalSupply[id]; // Cache total supply
        uint256 max = maxSupply[id]; // Cache max supply
        uint256 price = mintPrice[id]*amount; // Cache mint price
        uint256 protocolFee = flatMintFee + (mintFee * price)/100;
        require(supply + amount <= max, "Max supply exceeded");
        require(msg.value == price + protocolFee, "Incorrect payment");

        _mint(account, id, amount, data);
        totalSupply[id] = supply + amount; // Update storage once

        (bool success, ) = payable(danTreasury).call{value: protocolFee}("");
        require(success, "Payment transfer failed");

        // Transfer mint payment to contract owner (safe transfer)
        (success, ) = payable(owner()).call{value: price}("");
        require(success, "Transfer failed");
    }

    /// @notice Mint multiple ERC1155 tokens in a batch
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external payable nonReentrant{
        uint256 totalCost = 0;
        uint256 totalFee = flatMintFee;
        uint256 length = ids.length;
        
        require(to != address(0), "Cannot mint to zero address");
        require(length > 0, "No tokens to mint");
        require(length == amounts.length, "Mismatched IDs and amounts");

        for (uint256 i = 0; i < length; ) {
            uint256 id = ids[i]; // Cache id
            uint256 amount = amounts[i]; // Cache amount
            require(tokenExists[id], "Token does not exist");

            uint256 supply = totalSupply[id]; // Cache total supply
            uint256 max = maxSupply[id]; // Cache max supply
            uint256 price = mintPrice[id] * amount; // Cache mint price

            require(supply + amount <= max, "Max supply exceeded");
            totalCost += price; // Accumulate total cost
            totalFee += (mintFee * price) / 100; // Accumulate total fee
            totalSupply[id] = supply + amount; // Update storage once per ID
            unchecked { i++; } // Gas optimization
        }

        require(msg.value == totalCost + totalFee, "Incorrect payment");

        _mintBatch(to, ids, amounts, data);

        (bool success, ) = payable(danTreasury).call{value: totalFee}("");
        require(success, "Payment transfer failed");

        // Transfer mint payment to contract owner (safe transfer)
        (success, ) = payable(owner()).call{value: totalCost}("");
        require(success, "Transfer failed");
    }
}