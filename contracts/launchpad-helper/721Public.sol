// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract Public721V1 is ERC721URIStorage, Ownable, EIP712 {
    using ECDSA for bytes32;

    string private customName;
    string private customSymbol;
    uint256 public maxSupply;
    uint256 public mintPrice;
    bool private isInitialized;

    string private constant SIGNING_DOMAIN = "LazyNFT-Voucher";
    string private constant SIGNATURE_VERSION = "1";

    struct NFTVoucher {
        uint256 tokenId;
        uint256 minPrice;
        string uri;
        bytes signature;
    }

    constructor() ERC721("", "") EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)  {
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

    function init(
        string calldata _name,
        string calldata _symbol,
        uint256 price,
        uint256 _maxSupply,
        address ownerAddress // Pass owner address explicitly
    ) external {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        customName = _name;
        customSymbol = _symbol;
        mintPrice=price;
        maxSupply = _maxSupply;
        _transferOwnership(ownerAddress);
    }

    // /// @notice Mint NFT only if the signature matches the creator's pre-approved metadata
    // function mintNFT(
    //     uint256 tokenId,
    //     string calldata tokenURI,
    //     bytes calldata signature
    // ) external payable {
    //     require(msg.value == mintPrice, "Incorrect payment");
    //     require(tokenId <= maxSupply, "Max supply reached");

    //     address contractOwner = owner(); // Cache owner address in memory

    //     // Verify the signature using EIP-712
    //     bytes32 messageHash = keccak256(abi.encode(tokenId, tokenURI));
    //     require(
    //         contractOwner == messageHash.toEthSignedMessageHash().recover(signature),
    //         "Invalid signature"
    //     );

    //     _safeMint(msg.sender, tokenId);
    //     _setTokenURI(tokenId, tokenURI);

    //     // Transfer mint payment to creator
    //     (bool success, ) = payable(contractOwner).call{value: msg.value}("");
    //     require(success, "Payment transfer failed");
    // }

    function redeem(address redeemer, NFTVoucher calldata voucher) public payable returns (uint256) {
        require(msg.value >= voucher.minPrice, "Insufficient funds to redeem");
        require(voucher.tokenId <= maxSupply, "Max supply reached");

        address signer = verify(voucher);
        address contractOwner = owner(); // Cache owner address in memory

        // first assign the token to the signer, to establish provenance on-chain
        _mint(signer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);
        
        // transfer the token to the redeemer
        _transfer(signer, redeemer, voucher.tokenId);

         // Transfer mint payment to creator
        (bool success, ) = payable(contractOwner).call{value: msg.value}("");
        require(success, "Payment transfer failed");

        return voucher.tokenId;
    }

    function verify(NFTVoucher calldata voucher) public view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            keccak256("NFTVoucher(uint256 tokenId,uint256 minPrice,string uri)"),
            voucher.tokenId,
            voucher.minPrice,
            keccak256(bytes(voucher.uri))
        )));
    }

    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

}