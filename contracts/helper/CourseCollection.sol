// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CourseCollection is ERC721URIStorage, Ownable {

    uint256 public totalSupply;
    string private customName;
    string private customSymbol;

    constructor() ERC721("ED3", "ED3")  { 
    }

    // function init( IERC6551Registry _registry,address tbaImplementation) external {
    //     // _registry.createAccount(tbaImplementation, salt, block.chainid, address(_ipNFT), _ipTokenId);
    // }
    function mintAndName(
        string memory _name,
        string memory _symbol,
        address to, 
        string[] memory tokenURIs
    ) public {
        require(owner() == address(0), "Already initialized");
        customName = _name;
        customSymbol = _symbol;
        _transferOwnership(msg.sender);
        mintBatch(to, tokenURIs);
    }

    function mintBatch(
        address to, 
        string[] memory tokenURIs
    ) public onlyOwner {
        uint256 length = tokenURIs.length;

        uint256 startId = totalSupply; // Cache totalSupply to memory
        uint256 endId = startId + length;

        require(endId > startId, "Overflow risk"); // Prevent overflow

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = ++startId;
            _mint(to, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            unchecked { i++; } // Gas optimization
        }
        totalSupply = endId; // Store final totalSupply only once
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
