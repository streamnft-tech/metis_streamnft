// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.4;

import "../libraries/StreamStorage.sol";
import "../libraries/StreamLibrary.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/LibDiamond.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/IStreamNFT.sol";
import "../interfaces/IStreamNFT1155.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

contract RentUtil is ReentrancyGuard{

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Initialize the rental process for a token
     * @param tokenAddress The address of the token to be rented
     * @param tokenId The ID of the token to be rented
     * @param rentState The rental state for the token
     * @param validityMinutes The duration of the rental validity in minutes
     * @param noOfAssets Optional input for ERC1155 amount
     * @dev This function initializes the rental process for a token, allowing users to rent it for a specified duration.
     */
    function lendToken(
        address tokenAddress, 
        uint tokenId, 
        StreamLibrary.RentState calldata rentState, 
        uint256 validityMinutes, 
        uint256 noOfAssets, 
        bool existingIndex, 
        uint256 index) external
        {
            StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
            StreamLibrary.AssetManager memory _assetManager;
            uint256 masterIndex=1;
            if(tokenType==StreamLibrary.TokenType.ERC1155){
                if(existingIndex && StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index].initializer==msg.sender){
                    if(noOfAssets!=1){
                        revert StreamLibrary.InvalidOffer();
                    }
                    _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
                }     
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].push(StreamLibrary.FungibleAssetMaster(_assetManager,noOfAssets,noOfAssets));
                masterIndex= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].length;
            } else{
                _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
            }
            if(_assetManager.initializer != address(0)  && _assetManager.initializer != msg.sender){
                revert StreamLibrary.InvalidInitializer();
            }
            
            _assetManager.rentState.doMint=StreamStorage.getMapping().partnerConfig[tokenAddress].doMint;
            StreamLibrary.State currentState = _assetManager.state;
            if(currentState!=StreamLibrary.State.INIT && currentState!=StreamLibrary.State.LOAN && currentState!=StreamLibrary.State.SALE)
                revert StreamLibrary.AlreadyOnRent();
            if(rentState.isFixed){
                if(validityMinutes < rentState.fixedMinutes || rentState.fixedMinutes < StreamLibrary.MIN_RENT_MINUTES){
                    revert StreamLibrary.InvalidTimeDuration();
                }
                _assetManager.rentState.fixedMinutes=rentState.fixedMinutes;
            } else{
                if(validityMinutes < StreamLibrary.MIN_RENT_MINUTES){
                    revert StreamLibrary.InvalidTimeDuration();

                }
            }
            if(rentState.merkleRoot!=bytes32(0)){
                //private rental
                _assetManager.rentState.merkleRoot= rentState.merkleRoot;
            }
            _assetManager.rentState.validityExpiry=block.timestamp+validityMinutes*60;

            //done: remove tokenMap==0 and check isMinted==false
            processMint(_assetManager.rentState.doMint,tokenAddress,tokenId,noOfAssets);
            
            if(currentState==StreamLibrary.State.INIT){
                if(!StreamLibrary.checkOwner(tokenAddress,tokenId,msg.sender,noOfAssets)){
                    revert StreamLibrary.InvalidTokenAmount();
                }
                _assetManager.state=StreamLibrary.State.STALE;
                _assetManager.initializer=msg.sender;
                _assetManager.rentState.rentee=msg.sender;
            } else if( currentState == StreamLibrary.State.LOAN){
                if(_assetManager.rentState.validityExpiry > _assetManager.loanState.loanExpiry){
                    revert StreamLibrary.RequiredValidityLessThanLoan();
                }
                _assetManager.state=StreamLibrary.State.STALE_AND_LOAN;
            } else{ //SALE
                _assetManager.state=StreamLibrary.State.SALE_AND_STALE;
            }
            _assetManager.rentState.ownerShare=rentState.ownerShare;
            _assetManager.rentState.rate=rentState.rate; //perMinute
            _assetManager.rentState.isFixed=rentState.isFixed;
            //update storage
            if(tokenType==StreamLibrary.TokenType.ERC1155){
                console.log(tokenAddress, tokenId, msg.sender);
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex-1].assetManager = _assetManager;
            } else {
                StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
            }
            emit StreamLibrary.LendToken(tokenAddress,tokenId,masterIndex-1,msg.sender);
            if(_assetManager.state==StreamLibrary.State.STALE || _assetManager.state==StreamLibrary.State.SALE_AND_STALE){
                StreamLibrary.transferToken(msg.sender,address(this),tokenAddress,tokenId,false,false,noOfAssets);
            }
    }

    function processMint(bool doMint, address tokenAddress, uint256 tokenId, uint256 noOfAssets) private{
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);

        if(doMint && tokenType!=StreamLibrary.TokenType.ERC7066 && StreamStorage.getMapping().isMinted[tokenAddress][tokenId]==false){
                string memory uri;
                if(tokenType == StreamLibrary.TokenType.ERC721){
                    uint256 totalSupply= IStreamNFT(StreamStorage.getConfig().streamNFT).getTotalSupply();
                    StreamStorage.getMapping().tokenMap[tokenAddress][tokenId]=totalSupply;
                    uri=ERC721(tokenAddress).tokenURI(tokenId);
                    IStreamNFT(StreamStorage.getConfig().streamNFT).mint(address(this),uri);
                }
                if(tokenType == StreamLibrary.TokenType.ERC1155){
                    //done: same as above but with IStreamNFT1155
                    uint256 totalSupply= IStreamNFT1155(StreamStorage.getConfig().streamNFT).getTotalSupply();
                    StreamStorage.getMapping().tokenMap[tokenAddress][tokenId]=totalSupply;
                    uri=IERC1155MetadataURI(tokenAddress).uri(tokenId);
                    IStreamNFT1155(StreamStorage.getConfig().streamSFT).mint(address(this),uri,noOfAssets);
                    // IStreamNFT1155(StreamStorage.getConfig().streamNFT).mint(address(this),tokenId,noOfAssets,uri);
                }
                //done: isMinted=true
                StreamStorage.getMapping().isMinted[tokenAddress][tokenId]=true;
        }
        //isMinted==true
        else if(StreamStorage.getMapping().isMinted[tokenAddress][tokenId]==true){
            //done: nothing for ERC721
            //done: for ERC1155: mintExistingId(to,tokenMap[tokenAddress][tokenId],amount)
            if(tokenType == StreamLibrary.TokenType.ERC1155){
                IStreamNFT1155(StreamStorage.getConfig().streamSFT).mintExistingId(msg.sender,StreamStorage.getMapping().tokenMap[tokenAddress][tokenId],noOfAssets);
                
            } 
        }
    }


    // function checkErrorInsufficientFunds(uint256 amount) private {
    //     if(msg.value != amount){
    //       revert StreamLibrary.InsufficientFunds({
    //             provided: msg.value,
    //             required: amount
    //         });        
    //     }
    // }

    /**
     * @notice Process the rental of a token
     * @param tokenAddress The address of the token to be rented
     * @param tokenId The ID of the token to be rented
     * @param durationMinutes The duration of the rental period in minutes
     * @param index Optional argument for ERC1155
     * @dev This function allows users to process the rental of a token for a specified duration by providing the token address, token ID, and rental duration.
     * @dev The rentee address and rent expiry timestamp are set in the rentState of the assetManager.
     * @dev Note that the tokenAddress must correspond to a valid token address, and the tokenId must correspond to a valid token ID.
     */
    function processRent(
        address tokenAddress, 
        uint256 tokenId, 
        uint256 durationMinutes, 
        address _nftDiscount, 
        bytes32[] calldata proof, 
        uint256 index, 
        uint256 masterIndex, 
        bool existingAssetManager)
     external payable nonReentrant{
        //if existingIndex==true -> index is A.Manager else index is A.Master index
        // StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager memory _assetManager;
        if(StreamLibrary.checkTokenType(tokenAddress) == StreamLibrary.TokenType.ERC1155){
            if(existingAssetManager){
                _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
            } else{
                if(StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available<1){
                    revert StreamLibrary.InvalidTokenAmount();
                }
                _assetManager=StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager;
                index=StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId].length;
                StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId].push(_assetManager);
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available--;
                StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index]=StreamLibrary.MasterMap(true,masterIndex);
            }
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }
        uint protocolFee= (_assetManager.rentState.rate*durationMinutes)*StreamStorage.getConfig().streamRentalFee/100;
        if(_assetManager.rentState.validityExpiry<block.timestamp+durationMinutes*60)
        {   
            revert StreamLibrary.ExceededValidity();
        }
        if(_assetManager.rentState.isFixed && _assetManager.rentState.fixedMinutes!=durationMinutes)
        {
            revert StreamLibrary.InvalidTimeDuration();
        }   
        StreamLibrary.State currentState= _assetManager.state;
        if(currentState!=StreamLibrary.State.STALE && currentState!=StreamLibrary.State.STALE_AND_LOAN && currentState!=StreamLibrary.State.SALE_AND_STALE)
            revert StreamLibrary.InvalidAssetState();       

        if(_assetManager.rentState.merkleRoot!=bytes32(0)){
            if(MerkleProof.processProofCalldata(proof, keccak256(abi.encodePacked(msg.sender))) != 
            _assetManager.rentState.merkleRoot){
                revert StreamLibrary.PrivateRental();
            }
        }

        if( currentState==StreamLibrary.State.STALE ){ 
            _assetManager.state=StreamLibrary.State.RENT;

        } else if(currentState==StreamLibrary.State.STALE_AND_LOAN){ 
            _assetManager.state=StreamLibrary.State.RENT_AND_LOAN;
        } else {
            _assetManager.state=StreamLibrary.State.SALE_AND_RENT;
        }

        _assetManager.rentState.rentee=msg.sender;
        _assetManager.rentState.rentExpiry=block.timestamp+durationMinutes*60;

        //update storage
        if(StreamLibrary.checkTokenType(tokenAddress)==StreamLibrary.TokenType.ERC1155){
            StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index] = _assetManager;
        } else {
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
        }

        emit StreamLibrary.ProcessRent(tokenAddress, tokenId, index, _assetManager.initializer, msg.sender, _assetManager.rentState.rentExpiry);
        // if ERC7066 minted transfer it
        if(_assetManager.rentState.doMint){
            StreamLibrary.transferToken(address(this),msg.sender,tokenAddress,tokenId,true,true,1);
        }
        if(StreamLibrary.checkTokenType(tokenAddress) == StreamLibrary.TokenType.ERC7066 || StreamLibrary.checkTokenType(tokenAddress) == StreamLibrary.TokenType.ERC7066SFT) {
             StreamLibrary.transferToken(address(this),msg.sender,tokenAddress,tokenId,false,true,1);
        }
        protocolFee=StreamLibrary.applyDiscount(protocolFee,msg.sender,StreamLibrary.State.RENT,tokenAddress,_nftDiscount);
        StreamLibrary.settlePayment(tokenAddress,msg.sender,_assetManager.initializer,StreamLibrary.State.RENT,_assetManager.rentState.rate*durationMinutes,protocolFee,StreamStorage.getConfig().withdrawFee);
    }

     /** @notice Expire the rental period of a token
     * @param tokenAddress The address of the token
     * @param tokenId The ID of the token
     * @dev This function allows the expiration of the rental period for a token by providing the token address and token ID.
     */
    function expireRent(address tokenAddress, uint256 tokenId, uint256 index) external {
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager memory _assetManager;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }
        StreamLibrary.State currentState=_assetManager.state;
        if(_assetManager.rentState.rentExpiry>block.timestamp)
            revert StreamLibrary.PendingExpiry();

        if(currentState!=StreamLibrary.State.RENT && currentState!=StreamLibrary.State.RENT_AND_LOAN && currentState==StreamLibrary.State.SALE_AND_RENT)
            revert StreamLibrary.InvalidAssetState();
        if(currentState==StreamLibrary.State.RENT){ 
            _assetManager.state=StreamLibrary.State.STALE;
            if(tokenType==StreamLibrary.TokenType.ERC1155){
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].index].available++;
            } 
        }
        else if(currentState==StreamLibrary.State.RENT_AND_LOAN){
            _assetManager.state=StreamLibrary.State.STALE_AND_LOAN;
        } else{
            _assetManager.state=StreamLibrary.State.SALE_AND_STALE;
        }
 
        emit StreamLibrary.ExpireRent(tokenAddress, tokenId, _assetManager.rentState.rentee);
        address _rentee = _assetManager.rentState.rentee;
        _assetManager.rentState.rentee=_assetManager.initializer;
        //update storage
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index] = _assetManager;
        } else {
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
        }
        // transfer wrapped token if minted
        if(_assetManager.rentState.doMint){
            StreamLibrary.transferToken(_rentee,address(this),tokenAddress,tokenId,true,false,1);
        }
        if(tokenType == StreamLibrary.TokenType.ERC7066 || tokenType == StreamLibrary.TokenType.ERC7066SFT) {
            StreamLibrary.transferToken(_rentee,address(this),tokenAddress,tokenId,false,false,1);
        }
    }

    /**
     * @notice Cancel the rental of a token
     * @param tokenAddress The address of the token
     * @param tokenId The ID of the token
     * @dev This function allows the cancellation of the rental of a token by providing the token address and token ID.
     */
    function cancelLendToken(address tokenAddress, uint256 tokenId, uint256 index, bool cancelMaster) external {
        console.log("cancelLendToken");
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager memory _assetManager;
        uint256 count=1;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            console.log("cancelLendToken1");
            if(cancelMaster){
                _assetManager = StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].assetManager;
                count= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].available;
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].total-=count;
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].available=0;
            } else{
                _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
            }
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }
        if(_assetManager.initializer!=msg.sender)
            revert StreamLibrary.InvalidUser();
        StreamLibrary.State currentState=_assetManager.state;
        if(currentState!=StreamLibrary.State.STALE && currentState!=StreamLibrary.State.STALE_AND_LOAN && currentState!=StreamLibrary.State.SALE_AND_STALE)
            revert StreamLibrary.AlreadyRentedOut();
        
        if( _assetManager.state==StreamLibrary.State.STALE ){ 
            _assetManager.state=StreamLibrary.State.INIT; 
            _assetManager.initializer=address(0); 
        } else if( _assetManager.state==StreamLibrary.State.STALE_AND_LOAN){
            _assetManager.state=StreamLibrary.State.LOAN; 
        } else{ //SALE
            _assetManager.state=StreamLibrary.State.INIT; 
        }
        //update storage
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            if(cancelMaster){
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].assetManager = _assetManager;
            } else{
                StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index] = _assetManager;
            }
        } else {
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
        }
        
        emit StreamLibrary.CancelLendToken(tokenAddress, tokenId, msg.sender);
        if (_assetManager.state==StreamLibrary.State.INIT){
            StreamLibrary.transferToken(address(this),msg.sender,tokenAddress,tokenId,false,false,count);
        }
    }

    function shareReward(address tokenAddress, uint256 tokenId, address rewardToken, uint256 amount) external payable {
        StreamLibrary.AssetManager memory _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        if(_assetManager.state==StreamLibrary.State.INIT){
            revert StreamLibrary.InvalidAssetState();
        }
        uint256 ownerShare = amount.mul(_assetManager.rentState.ownerShare).div(100);
        uint256 renteeShare = amount.mul(100-_assetManager.rentState.ownerShare).div(100);

        if(rewardToken != address(0)){
            // Assuming you have an ERC20 interface for the paymentToken and token approval
            IERC20(rewardToken).safeTransferFrom( msg.sender,_assetManager.rentState.rentee, renteeShare);   
            IERC20(rewardToken).safeTransferFrom( msg.sender,_assetManager.initializer, ownerShare);   
        } else {
            // Direct ETH transfer
            StreamLibrary.checkErrorInsufficientFunds(amount);
            payable(_assetManager.rentState.rentee).transfer(renteeShare);   
            payable(_assetManager.initializer).transfer(ownerShare);   
        }
    }

    function updateWhiteList(address tokenAddress,uint256 tokenId,bytes32 newMerkleRoot) external{
        if(StreamStorage.getMapping().assetManager[tokenAddress][tokenId].initializer != msg.sender){
            revert StreamLibrary.InvalidInitializer();
        }
        StreamStorage.getMapping().assetManager[tokenAddress][tokenId].rentState.merkleRoot = newMerkleRoot;
    }
} 