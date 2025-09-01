pragma solidity ^0.8.0;

import "../libraries/ERC7066.sol";

contract StreamNFT is ERC7066{

    uint256 public totalSupply=1;
    address public owner;
    address public admin;
    mapping(uint256 => string) _tokenURIs;
    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor(address _admin) ERC721("StreamNFT", "StreamNFT") {  
        admin=_admin;
    }
    error NonExistentToken();
    error OwnerRequired();
    error AdminRequired();

    modifier checkOwner(){
        if(msg.sender!=owner) revert OwnerRequired();
        _;
    }
    modifier checkAdmin(){
        if(msg.sender!=admin) revert AdminRequired();
        _;
    }

    function mint(address to, string memory uri) checkOwner() external{
        _mint(to, totalSupply);
        _tokenURIs[totalSupply] = uri;
        totalSupply++;
    }

    function updateOwner(address _owner) checkAdmin() external{
        owner=_owner;
    }

    function updateAdmin(address _admin) checkAdmin() external{
        admin=_admin;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if(!_exists(tokenId)) revert NonExistentToken();
        return _tokenURIs[tokenId];
    }

    function getTotalSupply() external view returns(uint256){
        return totalSupply;
    }
}