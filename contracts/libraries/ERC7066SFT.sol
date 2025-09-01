// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "../interfaces/IERC7066SFT.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "hardhat/console.sol";

/// @title ERC7066: Lockable Extension for ERC721
/// @dev Implementation for the Lockable extension ERC7066 for ERC721
/// @author StreamNFT 

abstract contract ERC7066SFT is ERC1155,IERC7066SFT{


    // constructor() ERC1155("NFT") {}
    /*///////////////////////////////////////////////////////////////
                            ERC7066 EXTENSION STORAGE                        
    //////////////////////////////////////////////////////////////*/

    //Mapping from tokenId to user address for locker
    mapping(uint256 => mapping(address => mapping(address => uint256))) private locker;
    mapping(uint256 => mapping(address => mapping(address => uint256))) private _nftApproval;
    mapping(uint256 => mapping(address => uint256)) private lockedAmount;


    /*///////////////////////////////////////////////////////////////
                              ERC7066 LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the locker for the tokenId
     *      address(0) means token is not locked
     *      reverts if token does not exist
     */

    // isLocked true or false: if amount!=0 .., not assigned ..
    function getLocked(uint256 tokenId, address account, address operator) public virtual view override returns(uint256){
        return locker[tokenId][account][operator];
    }

    /**
     * @dev Public function to lock the token. Verifies if the msg.sender is owner or approved
     *      reverts otherwise
     */
    // lock: is locked true or false:  
    function lock(uint256 tokenId, address account, uint256 amount) public virtual override{
        require(
            account == _msgSender() || isApprovedForAll(account, _msgSender()) || getApprovalForId(tokenId,account,_msgSender())>=amount,
            "ERC1155: caller is not token owner or approved"
        );
        _lock(tokenId, account, _msgSender(), amount);
    }

    /**
     * @dev Public function to lock the token. Verifies if the msg.sender is owner
     *      reverts otherwise
     */
    // lock: is locked true or false:
    function lock(uint256 tokenId, address account, address _locker, uint256 amount) public virtual override{
        require(
            account == _msgSender() || isApprovedForAll(account, _locker) || getApprovalForId(tokenId,account,_locker)>=amount,
            "ERC1155: caller is not token owner or approved"
        );
        _lock(tokenId, account,_locker, amount);
    }

    /**
     * @dev Internal function to lock the token.
     */
    // _lock: = locked?? bool, amount??
    function _lock(uint256 tokenId, address account, address _locker, uint256 amount) internal {
        require(balanceOf(account, tokenId)>=amount,"ERC7066: Insufficient Balance");
        locker[tokenId][account][_msgSender()]=locker[tokenId][account][_msgSender()]+amount;
        lockedAmount[tokenId][account]=lockedAmount[tokenId][account]+amount;
        emit Lock(tokenId, account, _locker,amount);
    }

    /**
     * @dev Public function to unlock the token. Verifies the msg.sender is locker
     *      reverts otherwise
     */
    // unlock not check amount
    function unlock(uint256 tokenId, address account, uint256 amount) public virtual override{
        require(locker[tokenId][account][_msgSender()]>=amount,"ERC7066: Not Enough Locked");
        _unlock(tokenId,account,_msgSender(),amount);
    }

    /**
     * @dev Internal function to unlock the token. 
     */
    function _unlock(uint256 tokenId, address account, address _locker, uint256 amount) internal{
        locker[tokenId][account][_msgSender()]=locker[tokenId][account][_msgSender()]-amount;
        lockedAmount[tokenId][account]=lockedAmount[tokenId][account]-amount;
        emit Unlock(tokenId, account, _locker,amount);
    }

   /**
     * @dev Public function to tranfer and lock the token. Reverts if caller is not owner or approved.
     *      Lock the token and set locker to caller
     *.     Optionally approve caller if bool setApprove flag is true
     */
    function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove) public virtual override {
        _transferAndLock(tokenId,from,to,amount,setApprove);
    }

    /**
     * @dev Internal function to tranfer, update locker/approve and lock the token.
     */
    function _transferAndLock(uint256 tokenId, address from, address to, uint256 amount, bool setApprove) internal {
        safeTransferFrom(from, to, tokenId, amount, "" ); 
        if(setApprove){
            _nftApproval[tokenId][to][from]=_nftApproval[tokenId][to][from]+amount;
        }
        _lock(tokenId,to,msg.sender,amount);
    }

    /**
     * @dev Override approve to make sure token is unlocked
     */
    // nftapproval - uint256???
    // function setApprovalForAllId(uint256 tokenId, address operator, bool approved, uint256 amount) public virtual override(ERC1155){
    //     require (!locker[tokenId][_msgSender()][operator], "ERC7066: Locked");
    //     _nftApproval[tokenId][_msgSender()][operator]=amount;
    // }
    function setApprovalForId(uint256 tokenId, address operator, uint256 amount) public virtual override {
        require (amount>locker[tokenId][_msgSender()][operator], "ERC7066: Revoking Locked Approval");
        _nftApproval[tokenId][_msgSender()][operator]=amount;
    }

    function getApprovalForId(uint256 tokenId, address account, address operator) public virtual returns(uint256) {
        return _nftApproval[tokenId][account][operator];
    }
    
    /*///////////////////////////////////////////////////////////////
                              OVERRIDES
    //////////////////////////////////////////////////////////////*/

    // /**
    //  * @dev Override approve to make sure token is unlocked
    //  */
    // function setApprovalForAll(address operator, bool approved) public virtual override(ERC1155){
    //     require (!locker[_msgSender()][operator], "ERC7066: Locked");
    //     super.approve(to, tokenId);
    //     _setApprovalForAll(_msgSender(), operator, approved);
    // }

    // function setApprovalForAll(address to, uint256 tokenId) public virtual override(IERC721, ERC721) {
    //     require (locker[tokenId]==address(0), "ERC7066: Locked");
    //     super.approve(to, tokenId);
    // }

    /**
     * @dev See {IERC1155-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override(ERC1155,IERC1155) {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()) ||  getApprovalForId(id,from,_msgSender()) >= amount,
            "ERC1155: caller is not token owner or approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
    }

    /**
     * @dev Override _beforeTokenTransfer to make sure token is unlocked or msg.sender is approved if 
     * token is lockApproved
     */
    //changes fine??
    function _beforeTokenTransfer( 
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        // if it is a Transfer or Burn, we always deal with one token, that is startTokenId
        if (from != address(0)) { 
            //done: iterate for all ids and amount (create for loop)
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId = ids[i];
                uint256 amount = amounts[i];
                if(locker[tokenId][from][operator]>0){
                    require( getApprovalForId(tokenId,from,operator) >= amount,"ERC7066: Locked");
                } else{
                    console.log("ERC7066: Can't Spend Locked--");
                    console.log(balanceOf(from, tokenId));
                    // console.log(balanceOf(from, tokenId)-amount);
                    console.log(lockedAmount[tokenId][from]);
                    require(balanceOf(from, tokenId)-amount >= lockedAmount[tokenId][from],"ERC7066: Can't Spend Locked");
                }
            }
        }
        super._beforeTokenTransfer(operator,from,to,ids,amounts,data);
    }

    /**
     * @dev Override _afterTokenTransfer to make locker is purged
     */
    //changes fine??
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        // if it is a Transfer or Burn, we always deal with one token, that is startTokenId
        if (from != address(0)) { 
            //done: iterate for all ids and amount (create for loop)
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId=ids[i];
                uint256 amount = amounts[i];
                if(getApprovalForId(tokenId,from,operator)>=amount){
                    _nftApproval[tokenId][from][operator]=getApprovalForId(tokenId,from,operator)-amount;
                    if(locker[tokenId][from][operator]>0){
                        if(amount>=locker[tokenId][from][operator]){
                            lockedAmount[tokenId][from]=lockedAmount[tokenId][from]-locker[tokenId][from][operator];         
                            locker[tokenId][from][operator]=0;
                        } else{
                            lockedAmount[tokenId][from]=lockedAmount[tokenId][from]-amount;         
                            locker[tokenId][from][operator]=locker[tokenId][from][operator]-amount;
                        }
                    }
                }
            }  
        }
        super._afterTokenTransfer(operator,from,to,ids,amounts,data);
    }

     /*///////////////////////////////////////////////////////////////
                              ERC165 LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC1155) returns (bool) {
         return
            interfaceId == type(IERC7066SFT).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}