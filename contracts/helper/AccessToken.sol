pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AccessToken is ERC721, Ownable { //7066

    uint256 public maxSupply;
    uint public totalSupply;
    address public tbaAccount;
    string private customName;
    string private customSymbol;
    string public baseURI;

    constructor () ERC721("AccessToken", "ACCESS"){
    }

    function init(address _tbaAccount, uint256 _maxSupply, string calldata _name, string calldata _symbol, string calldata _tokenURI) public{
        require(tbaAccount == address(0), "Already initialized");
        tbaAccount = _tbaAccount;
        maxSupply= _maxSupply;
        customName = _name;
        customSymbol = _symbol;
        baseURI = _tokenURI;
        _transferOwnership(msg.sender);
    }

    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = totalSupply + 1; // Store in memory
        require(tokenId <= maxSupply, "Max Supply Reached"); 

        totalSupply = tokenId; // Update storage once
        _mint(to, tokenId);
        return tokenId;
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

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return baseURI;
    }
}