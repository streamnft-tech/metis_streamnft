pragma solidity ^0.8.0;

import "../libraries/ERC7066SFT.sol";

contract StreamSFT is ERC7066SFT{

    uint256 public totalSupply=1;
    address public owner;
    address public admin;
    mapping(uint256 => string) _tokenURIs;

    /**
     * @dev See {_setURI}.
     */
    constructor(address _admin) ERC1155("StreamSFT") {  
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

    // function mint(address to, string memory uri) checkOwner() external{
    //     _mint(to, totalSupply); //done: input takes amount to mint
    //     _tokenURIs[totalSupply] = uri;
    //     totalSupply++;
    // }

    function mint(address to, string memory uri, uint256 amount) checkOwner() external{
        
        _mint(to, totalSupply, amount, "");
        _tokenURIs[totalSupply] = uri;
        totalSupply++;
    }

    function mintExistingId(address to, uint256 id, uint256 amount) checkOwner() external{
         _mint(to, id, amount, "");
    }

    function updateOwner(address _owner) checkAdmin() external{
        owner=_owner;
    }

    function updateAdmin(address _admin) checkAdmin() external{
        admin=_admin;
    }

    // no exixts function
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        // if(!_exists(tokenId)) revert NonExistentToken();
        return _tokenURIs[tokenId];
    }

    function getTotalSupply() external view returns(uint256){
        return totalSupply;
    }

    function checkInterface() public pure returns(bytes4) {
        return type(IERC7066SFT).interfaceId;
    }
}