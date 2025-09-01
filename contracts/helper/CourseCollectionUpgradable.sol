// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// contract CourseCollectionUpgradable is Initializable, ERC721URIStorageUpgradeable, OwnableUpgradeable {
//     uint256 public nextTokenId;

//     event NFTMinted(address indexed to, uint256 tokenId, string tokenURI);

//     /// @custom:oz-upgrades-unsafe-allow constructor
//     constructor() {
//         // Prevent the implementation contract from being initialized
//         _disableInitializers();
//     }

//     /**
//      * @dev Initializer function (replaces the constructor).
//      * Can only be called once.
//      */
//     function initialize(
//         string memory name, 
//         string memory symbol, 
//         address to, 
//         string[] memory tokenURIs
//     ) public initializer {
//         __ERC721_init(name, symbol);
//         __ERC721URIStorage_init();
//         __Ownable_init(); 
//         nextTokenId = 1;
//         mintBatch(to, tokenURIs);
//     }

//     function mintBatch(address to, string[] memory tokenURIs) public onlyOwner {
//         require(tokenURIs.length > 0, "No token URIs provided");

//         for (uint256 i = 0; i < tokenURIs.length; i++) {
//             uint256 tokenId = nextTokenId;
//             _safeMint(to, tokenId);
//             _setTokenURI(tokenId, tokenURIs[i]);
//             emit NFTMinted(to, tokenId, tokenURIs[i]);
//             nextTokenId++;
//         }
//     }

//     /**
//      * @dev Mint a new token to the specified address with a specific token URI.
//      * Only callable by the contract owner.
//      */
//     function mint(address to, uint256 tokenId, string memory tokenURI) external onlyOwner {
//         _mint(to, tokenId);
//         _setTokenURI(tokenId, tokenURI);
//     }

//     /**
//      * @dev Update the URI for an existing token.
//      * Only callable by the contract owner.
//      */
//     function updateTokenURI(uint256 tokenId, string memory tokenURI) external onlyOwner {
//         require(_exists(tokenId), "URI set of nonexistent token");
//         _setTokenURI(tokenId, tokenURI);
//     }

//     /**
//      * @dev Burn a token.
//      * Only callable by the contract owner.
//      */
//     function burn(uint256 tokenId) external onlyOwner {
//         _burn(tokenId);
//     }

//     /**
//      * @dev Override _burn to ensure token URI cleanup.
//      */
//     function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
//         super._burn(tokenId);
//     }

//     /**
//      * @dev Override tokenURI to use ERC721URIStorage logic.
//      */
//     function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
//         return super.tokenURI(tokenId);
//     }
// }
