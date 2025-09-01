// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;

import "../libraries/StreamStorage.sol";
import "../libraries/StreamLibrary.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// import "hardhat/console.sol";

contract LoanUtil is ReentrancyGuard{

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    modifier checkAdmin(){
        if(msg.sender!=StreamStorage.getConfig().admin) revert StreamLibrary.RequiredAdmin();
        _;
    }

    // @notice Update discount for projects
    // @param index for loan pool
    function deleteLoanPool(uint256 index) checkAdmin() external {
        if(StreamStorage.getMapping().loanPoolList.loanPools[index-1].totalLoanOffer>0)  revert StreamLibrary.OffersExist();
        delete StreamStorage.getMapping().loanPoolList.loanPools[index-1];
    }

    /**
    * @notice Create the crowdfund campaign based on the inputs
    * @param tokenAddress with required properties
    * @param loanDurationInMinutes with required properties
    * @param interestRateLender with required properties
    * @param interestRateProtocol with required properties
    */
    function createLoanPool(
        address tokenAddress,
        uint loanDurationInMinutes,
        uint interestRateLender,
        uint interestRateProtocol) external checkAdmin(){
         StreamLibrary.LoanPool memory loanPool;

        loanPool.initializerKey = msg.sender;
        loanPool.totalLoanOffer = 0;
        loanPool.lastBidAmount = 0;
        loanPool.tokenAddress = tokenAddress;
        loanPool.loanDurationInMinutes = loanDurationInMinutes;
        loanPool.interestRateLender = interestRateLender;
        loanPool.interestRateProtocol = interestRateProtocol;
        StreamStorage.getMapping().loanPoolList.loanPools.push(loanPool);
        emit StreamLibrary.CreateLoanPool(StreamStorage.getMapping().loanPoolList.loanPools.length - 1);
    }

    /** 
    * @notice Create a new loan LoanOffer for a loan pool
    * @param bidAmount The bidAmount containing the required properties
    * @param poolIndex The poolIndexcontaining the required properties
    * @param totalBids The totalBids containing the required properties
    * @dev The function throws an error if the sender does not provide the exact required amount of Ether.
    * @dev Note that the LoanPoolIndex in the _loanOffer object must correspond to an existing bid pool.
    */
    function addLoanOffer(uint bidAmount,
        uint poolIndex,
        uint totalBids
        ) external payable{
        StreamLibrary.checkErrorInsufficientFunds(bidAmount * totalBids);
        StreamLibrary.LoanOffer memory loanOffer;
        loanOffer.bidderPubkey = msg.sender;
        loanOffer.bidAmount = bidAmount;
        loanOffer.totalBids = totalBids;
        loanOffer.poolIndex = poolIndex;
        loanOffer.pendingLoans = 0;
        ++StreamStorage.getMapping().loanPoolList.loanPools[loanOffer.poolIndex].totalLoanOffer;
        StreamStorage.getMapping().loanOfferList[loanOffer.poolIndex].loanOffers.push(loanOffer);
        emit StreamLibrary.AddLoanOffer(loanOffer.poolIndex,StreamStorage.getMapping().loanOfferList[loanOffer.poolIndex].loanOffers.length-1,loanOffer.bidAmount,loanOffer.totalBids);
    }

    /** 
    * @notice Update loan offer amount
    * @param poolIndex index of loan pool
    * @param offerIndex index of loan offer
    * @param updatedOffer updated offer amount
    * @dev The function throws an error if the sender does not provide the exact required amount of Ether.
    */
    function updateOfferAmount(uint256 poolIndex, uint256 offerIndex, uint256 updatedOffer) external payable{
        StreamLibrary.LoanOffer storage offer = StreamStorage.getMapping().loanOfferList[poolIndex].loanOffers[offerIndex];
        if(offer.bidderPubkey != msg.sender){
            revert StreamLibrary.InvalidUser();
        }
        emit StreamLibrary.UpdateOfferAmount(poolIndex, offerIndex, updatedOffer);
        uint256 bidAmount=offer.bidAmount;
        offer.bidAmount=updatedOffer;
        if(bidAmount>updatedOffer){
            payable(offer.bidderPubkey).transfer(offer.totalBids*(bidAmount-updatedOffer));
        } else{
            StreamLibrary.checkErrorInsufficientFunds(offer.totalBids*(updatedOffer-bidAmount));
        }
    }

    /** 
    * @notice Update loan offer count
    * @param poolIndex index of loan pool
    * @param offerIndex index of loan offer
    * @param updatedCount updated offer count
    * @dev The function throws an error if the sender does not provide the exact required amount of Ether.
    */
    function updateOfferCount(uint256 poolIndex, uint256 offerIndex, uint256 updatedCount) external payable{
        StreamLibrary.LoanOffer storage offer = StreamStorage.getMapping().loanOfferList[poolIndex].loanOffers[offerIndex];
        if(offer.bidderPubkey != msg.sender){
            revert StreamLibrary.InvalidUser();
        }
        emit StreamLibrary.UpdateOfferCount(poolIndex, offerIndex, updatedCount);
        uint256 totalBids=offer.totalBids;
        offer.totalBids=updatedCount;
        if(updatedCount<=totalBids){
            payable(offer.bidderPubkey).transfer(offer.bidAmount*(totalBids-updatedCount));
        } else{
            StreamLibrary.checkErrorInsufficientFunds(offer.bidAmount*(updatedCount-totalBids));
        }
    }

    /**
     * @notice Process a loan for a msg.sender
     * @param loanPoolIndex The index of the bid pool
     * @param loanOfferIndex The index of the bid manager within the bid pool
     * @param tokenId The ID of the token
     * @dev Note that the _LoanPoolIndex and _LoanOfferIndex must correspond to valid indexes in the loanPoolList.loanPools and loanOffers arrays, respectively.
     */
    function processLoan(
        uint loanPoolIndex,
        uint loanOfferIndex,
        uint256 tokenId,
        uint256 index,
        bool existingAsset,
        bool useMaster
    ) external payable nonReentrant{
        StreamLibrary.LoanPool memory pool= StreamStorage.getMapping().loanPoolList.loanPools[loanPoolIndex];
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(pool.tokenAddress);
        StreamLibrary.AssetManager memory _assetManager;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            if(!existingAsset){
                uint256 assetIndex=StreamStorage.getMapping().fungibleAssetManager[pool.tokenAddress][tokenId].length;
                StreamStorage.getMapping().fungibleAssetManager[pool.tokenAddress][tokenId].push(_assetManager);
                if(useMaster){
                    if(StreamStorage.getMapping().fungibleAssetMaster[pool.tokenAddress][tokenId][index].available<1){
                        revert StreamLibrary.InsufficientFunds(0,1);
                    }
                    StreamStorage.getMapping().fungibleAssetMaster[pool.tokenAddress][tokenId][index].available--;
                    StreamStorage.getMapping().assetToMasterMap[pool.tokenAddress][tokenId][assetIndex]=StreamLibrary.MasterMap(true,index);
                    _assetManager = StreamStorage.getMapping().fungibleAssetMaster[pool.tokenAddress][tokenId][index].assetManager;
                }
                index=assetIndex;
            } else{
                _assetManager = StreamStorage.getMapping().fungibleAssetManager[pool.tokenAddress][tokenId][index];
            }
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[pool.tokenAddress][tokenId];
        }

        StreamLibrary.State tokenState = StreamStorage.getMapping().assetManager[pool.tokenAddress][tokenId].state;
        if(tokenState!=StreamLibrary.State.INIT && tokenState!=StreamLibrary.State.RENT && tokenState!=StreamLibrary.State.STALE){
            revert StreamLibrary.InvalidAssetState();
        }

        if(_assetManager.initializer!=address(0) && _assetManager.initializer!=msg.sender){
            revert StreamLibrary.InvalidInitializer();
        }

        //check different states of token
        if(_assetManager.state==StreamLibrary.State.RENT){
            if(block.timestamp+pool.loanDurationInMinutes*60<StreamStorage.getMapping().assetManager[pool.tokenAddress][tokenId].rentState.validityExpiry)
                revert StreamLibrary.RequiredValidityLessThanLoan();
            _assetManager.state=StreamLibrary.State.RENT_AND_LOAN;
        }
        else if(_assetManager.state==StreamLibrary.State.STALE){
            if(block.timestamp+pool.loanDurationInMinutes*60<StreamStorage.getMapping().assetManager[pool.tokenAddress][tokenId].rentState.validityExpiry)
                revert StreamLibrary.RequiredMoreThanRentValdity();
            _assetManager.state=StreamLibrary.State.STALE_AND_LOAN;
        } 
        else{
            _assetManager.state=StreamLibrary.State.LOAN;
            _assetManager.initializer=msg.sender;

            if(!StreamLibrary.checkOwner(pool.tokenAddress,tokenId,msg.sender,1)){
                revert StreamLibrary.InvalidTokenType();
            }
        }
        StreamLibrary.LoanOffer memory _LoanOffer = StreamStorage.getMapping().loanOfferList[loanPoolIndex].loanOffers[loanOfferIndex];
        if(_LoanOffer.totalBids<1) 
            revert StreamLibrary.AllOffersTaken();

        _assetManager.loanState.loanPoolIndex=loanPoolIndex;
        _assetManager.loanState.loanOfferIndex=loanOfferIndex;
        _assetManager.loanState.provider=_LoanOffer.bidderPubkey;
        _assetManager.loanState.loanAmount=_LoanOffer.bidAmount;
        _assetManager.loanState.isNFTLoan=false;
        uint expiry = block.timestamp+pool.loanDurationInMinutes*60;
        _assetManager.loanState.loanExpiry=expiry;   

        //update assetmanager    
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            StreamStorage.getMapping().fungibleAssetManager[pool.tokenAddress][tokenId][index] = _assetManager;
        } else {
            StreamStorage.getMapping().assetManager[pool.tokenAddress][tokenId] = _assetManager;
        }        
        --StreamStorage.getMapping().loanOfferList[loanPoolIndex].loanOffers[loanOfferIndex].totalBids;
        ++StreamStorage.getMapping().loanOfferList[loanPoolIndex].loanOffers[loanOfferIndex].pendingLoans;
        StreamStorage.getMapping().loanPoolList.loanPools[loanPoolIndex].lastBidAmount=_LoanOffer.bidAmount;

        emit StreamLibrary.ProcessLoan(pool.tokenAddress, tokenId, index, _LoanOffer.bidderPubkey, msg.sender, _LoanOffer.bidAmount, expiry);

        //send loan amount
        address payable receiver = payable(msg.sender);
        receiver.transfer(_LoanOffer.bidAmount);
        // send revoke fee
        StreamLibrary.checkErrorInsufficientFunds(StreamStorage.getConfig().withdrawFee);
        payable(StreamStorage.getConfig().streamTreasury).transfer(StreamStorage.getConfig().withdrawFee);
        // transfer NFT to contract
        if( _assetManager.state==StreamLibrary.State.LOAN){
            if(tokenType==StreamLibrary.TokenType.ERC1155 && useMaster){
                // do nothing?
            }else{
                StreamLibrary.transferToken(msg.sender,address(this),pool.tokenAddress,tokenId,false,false,1);            
            }
        }
    }

    /**
     * @notice Repay a loan for a user's asset
     * @param tokenAddress The address of NFT
     * @param tokenId The token id of NFT
     */
    function repayLoan(address tokenAddress, uint tokenId, address _nftDiscount, uint256 index) external payable {
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager storage _assetManager;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }
        (uint256 total, address loanProvider, uint256 protocolFee)=StreamLibrary.getLoanValues(_assetManager,tokenAddress,tokenId, index);
        StreamLibrary.State tokenState = _assetManager.state;
        if(_assetManager.loanState.loanExpiry<block.timestamp)
            revert StreamLibrary.Expired();
        if(_assetManager.initializer!=msg.sender){
            revert StreamLibrary.InvalidUser();
        }
        if(tokenState==StreamLibrary.State.LOAN){
            tokenState=StreamLibrary.State.INIT;
            _assetManager.initializer=address(0);
            if(tokenType==StreamLibrary.TokenType.ERC1155){
                if(StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].hasMapping){
                    StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].index].available++;
                }
            }
        }else if(tokenState==StreamLibrary.State.RENT_AND_LOAN) {
            tokenState=StreamLibrary.State.RENT;
        }else{
            tokenState=StreamLibrary.State.STALE;
        }
        _assetManager.state=tokenState;
        emit StreamLibrary.RepayLoan(tokenAddress, tokenId, index, loanProvider, msg.sender, total);
        protocolFee=StreamLibrary.applyDiscount(protocolFee,loanProvider,StreamLibrary.State.LOAN,tokenAddress,_nftDiscount);
        StreamLibrary.settlePayment(tokenAddress,msg.sender,loanProvider,StreamLibrary.State.LOAN,total,protocolFee,0);
        //send the NFT back to loan taker
        if(tokenState==StreamLibrary.State.INIT){
            StreamLibrary.transferToken(address(this),msg.sender,tokenAddress,tokenId,false,false,1); 
        }
    }

    /**
     * @notice Expire a loan for a user's asset
     * @param tokenAddress The address of NFT
     * @param tokenId The token id of NFT
     */
    function expireLoan(address tokenAddress, uint tokenId, uint256 index) external{
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager storage _assetManager;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }        
        if(_assetManager.state==StreamLibrary.State.LOAN || _assetManager.state==StreamLibrary.State.STALE_AND_LOAN){
            if(StreamStorage.getMapping().nftPools[tokenAddress][tokenId][index].initializerKey==address(0)){
                --StreamStorage.getMapping().loanOfferList[_assetManager.loanState.loanPoolIndex].loanOffers[_assetManager.loanState.loanOfferIndex].pendingLoans;
            } else {
                StreamStorage.getMapping().nftPools[tokenAddress][tokenId][index].initializerKey=address(0);
            }
        } else{
            revert StreamLibrary.InvalidAssetState();
        }
        if(_assetManager.loanState.loanExpiry>block.timestamp)
        revert StreamLibrary.PendingExpiry();

        _assetManager.state=StreamLibrary.State.INIT;
        _assetManager.initializer=address(0);
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            //todo: why this if? what else?
            if(StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].hasMapping){
                StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].index].available++;
            }
        }
        emit StreamLibrary.ExpireLoan(tokenAddress, tokenId, _assetManager.loanState.provider, _assetManager.initializer);
        StreamLibrary.transferToken(address(this),_assetManager.loanState.provider,tokenAddress,tokenId,false,false,1);
    }

    function createNFTPool(
        address tokenAddress,
        uint256 tokenId,
        uint loanDurationInMinutes,
        uint interestRateLender,
        uint bidAmount,
        uint256 index,
        bool existingAsset,
        bool useMaster
    ) external{
        StreamLibrary.NFTPool memory nftPool = StreamLibrary.NFTPool({
            initializerKey: msg.sender,
            loanDurationInMinutes: loanDurationInMinutes,
            interestRateLender: interestRateLender,
            bidAmount: bidAmount,
            interestRateProtocol: 0
        });
        StreamStorage.getMapping().nftPools[tokenAddress][tokenId][index]=nftPool;

        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager memory _assetManager;
        
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            if(!existingAsset){
                uint256 assetIndex=StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId].length;
                StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId].push(_assetManager);
                if(useMaster){
                    if(StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].available<1){
                        revert StreamLibrary.InsufficientFunds(0,1);
                    }
                    StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].available--;
                    StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][assetIndex]=StreamLibrary.MasterMap(true,index);
                    _assetManager = StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].assetManager;
                }
                index=assetIndex;
            } else{
                _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
            }
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }    
        _assetManager.initializer = msg.sender;

        if(_assetManager.state == StreamLibrary.State.RENT ){
            _assetManager.state = StreamLibrary.State.RENT_AND_PRE_LOAN;
        } else if( _assetManager.state == StreamLibrary.State.INIT){
            _assetManager.state = StreamLibrary.State.PRE_LOAN;
        } else if(_assetManager.state == StreamLibrary.State.STALE){
            _assetManager.state = StreamLibrary.State.STALE_AND_PRE_LOAN;
        } else{
            revert StreamLibrary.InvalidAssetState();
        }

        if(tokenType==StreamLibrary.TokenType.ERC1155){
            StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index] = _assetManager;
        } else {
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
        }
        emit StreamLibrary.CreateNFTPool(tokenAddress, tokenId, index, loanDurationInMinutes, interestRateLender,bidAmount);
        StreamLibrary.transferToken(msg.sender,address(this),tokenAddress,tokenId,false,false,1);            
    }

    function removeNFTPool(address tokenAddress,uint256 tokenId, uint256 index) external {
        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.State current;
        if(StreamStorage.getMapping().nftPools[tokenAddress][tokenId][index].initializerKey!=msg.sender){
            revert StreamLibrary.InvalidUser();
        }
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            current = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index].state;
        } else{
            current = StreamStorage.getMapping().assetManager[tokenAddress][tokenId].state;
        }    
        if(current == StreamLibrary.State.PRE_LOAN){
            current = StreamLibrary.State.INIT;
            if(tokenType==StreamLibrary.TokenType.ERC1155){
                if(StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].hasMapping){
                    StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][StreamStorage.getMapping().assetToMasterMap[tokenAddress][tokenId][index].index].available++;
                }
            }
        } else if(current == StreamLibrary.State.RENT_AND_PRE_LOAN){
            current = StreamLibrary.State.RENT;
        } else if(current == StreamLibrary.State.STALE_AND_PRE_LOAN){
            current = StreamLibrary.State.STALE;
        } else{
            revert StreamLibrary.InvalidAssetState();
        } 
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index].state=current;
        } else{
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId].state=current;
        }    
        delete StreamStorage.getMapping().nftPools[tokenAddress][tokenId][index];
        emit StreamLibrary.RemoveNFTPool(tokenAddress,tokenId);
        StreamLibrary.transferToken(address(this),msg.sender,tokenAddress,tokenId,false,false,1);            
    }

    function acceptOffer(
        address tokenAddress,
        uint256 tokenId,
        uint256 index    
        ) external payable {
        StreamLibrary.NFTPool memory nftPool = StreamStorage
            .getMapping().nftPools[tokenAddress][tokenId][index];

        StreamLibrary.TokenType tokenType=StreamLibrary.checkTokenType(tokenAddress);
        StreamLibrary.AssetManager memory _assetManager;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            _assetManager = StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
        } else{
            _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        }

        if( _assetManager.state == StreamLibrary.State.STALE_AND_PRE_LOAN){
            if(block.timestamp+nftPool.loanDurationInMinutes*60<StreamStorage.getMapping().assetManager[tokenAddress][tokenId].rentState.validityExpiry)
                revert StreamLibrary.InvalidTimeDuration();
            _assetManager.state = StreamLibrary.State.STALE_AND_LOAN;
        }else if(_assetManager.state == StreamLibrary.State.RENT_AND_PRE_LOAN ){
            if(block.timestamp+nftPool.loanDurationInMinutes*60<StreamStorage.getMapping().assetManager[tokenAddress][tokenId].rentState.validityExpiry)
                revert StreamLibrary.InvalidTimeDuration();
            _assetManager.state=StreamLibrary.State.RENT_AND_LOAN;
        } else if(_assetManager.state == StreamLibrary.State.PRE_LOAN){
            _assetManager.state = StreamLibrary.State.LOAN;
        } else{
            revert StreamLibrary.InvalidAssetState();
        }
        _assetManager.loanState.provider = msg.sender;
        uint expiry = block.timestamp + nftPool.loanDurationInMinutes * 60;
        _assetManager.loanState.loanExpiry = expiry;
        _assetManager.loanState.isNFTLoan = true;
        _assetManager.loanState.loanAmount = msg.value;
        StreamStorage.getMapping().nftPools[tokenAddress][tokenId][index].interestRateProtocol= StreamStorage.getConfig().streamLoanFee;
        if(tokenType==StreamLibrary.TokenType.ERC1155){
            StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index] = _assetManager;
        } else {
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
        }
        emit StreamLibrary.AcceptOffer(tokenAddress,tokenId,msg.value);
        // payment from sender to loan pool initializer
        if(msg.sender!=nftPool.initializerKey){
            StreamLibrary.checkErrorInsufficientFunds(nftPool.bidAmount);
            payable(_assetManager.initializer).transfer(msg.value);
        } else{
            payable(_assetManager.initializer).transfer(msg.value); //TODO: user send funds to themselves?????
        }
    }
} 