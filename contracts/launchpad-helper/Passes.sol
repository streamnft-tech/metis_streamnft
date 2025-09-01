// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Passes is ERC721, Ownable, ReentrancyGuard {
    uint256 public totalSupply;
    uint256 public maxSupply;
    string public baseURI;
    string private customName;
    string private customSymbol;
    uint256 public mintPrice;
    uint256 public mintFee;
    address public danTreasury;
    uint256 public constant MAX_BATCH_SIZE = 100;

    constructor() ERC721("certi1", "certi1") {}

    function init(
        string memory _name,
        string memory _symbol,
        uint256 price,
        uint256 _maxSupply,
        address ownerAddress,
        string calldata _tokenURI,
        uint256 _mintFee,
        address _danTreasury
    ) external {
        require(owner() == address(0), "Already initialized"); // Ensure init can only be called once
        mintPrice = price;
        customName = _name;
        customSymbol = _symbol;
        maxSupply = _maxSupply;
        baseURI=_tokenURI;
        mintFee = _mintFee;
        danTreasury = _danTreasury;
        _transferOwnership(ownerAddress);
    }

    function mint(address to) external payable nonReentrant{
        require(msg.value == mintPrice + mintFee, "Incorrect payment");
        uint256 tokenId = totalSupply + 1; // Store in memory
        require(tokenId <= maxSupply, "Max Supply Reached");

        totalSupply = tokenId; // Store updated totalSupply once
        _mint(to, tokenId);

        (bool success, ) = payable(danTreasury).call{value: mintFee}("");
        require(success, "Payment transfer failed");

        (success, ) = payable(owner()).call{value: mintPrice}("");
        require(success, "Payment transfer failed");
    }

    function batchMint(uint256 length) external onlyOwner nonReentrant{
        require(length<=MAX_BATCH_SIZE, "Max batch size is 100");
        uint256 _totalSupply = totalSupply; // Cache totalSupply in memory
        require(_totalSupply + length <= maxSupply, "Max supply exceeded");

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = ++_totalSupply; // Increment cached totalSupply
            _mint(owner(), tokenId);
            unchecked { i++; } // Gas optimization
        }
        totalSupply = _totalSupply; // Store totalSupply only once after the loop
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
