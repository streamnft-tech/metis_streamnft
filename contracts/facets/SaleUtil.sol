// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../libraries/StreamStorage.sol";
import "../libraries/StreamLibrary.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

interface IERC2981 {
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view returns (address receiver, uint256 royaltyAmount);
    }
bytes4 constant INTERFACE_ID_ERC2981 = 0x2a55205a;

contract SaleUtil is ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 constant PERCENTAGE_DIVISOR= 100000; // 100 * DECIMAL_MULTIPLIER

    function listForSale(address tokenAddress, uint256 tokenId, StreamLibrary.BuyOffer memory offer) external nonReentrant{
        if(! StreamLibrary.checkOwner(tokenAddress, tokenId, msg.sender, offer.count) ){
            revert StreamLibrary.InvalidUser();
        }
        StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(
            tokenAddress
        );

        if (
            tokenType != StreamLibrary.TokenType.ERC721 &&
            tokenType != StreamLibrary.TokenType.ERC1155
        ) revert StreamLibrary.InvalidTokenType();

        StreamLibrary.AssetManager memory assetManager;
        uint256 masterIndex;

        if (tokenType == StreamLibrary.TokenType.ERC721) {
            if (
                IERC721(tokenAddress).getApproved(tokenId) != address(this) &&
                !IERC721(tokenAddress).isApprovedForAll(
                    msg.sender,
                    address(this)
                )
            ) {
                revert StreamLibrary.InsufficientAuthorization();
            }
            assetManager= StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        } else if (tokenType == StreamLibrary.TokenType.ERC1155) {
            if (
                !IERC1155(tokenAddress).isApprovedForAll(
                    msg.sender,
                    address(this)
                )
            ) {
                revert StreamLibrary.InsufficientAuthorization();
            }
            StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].push(StreamLibrary.FungibleAssetMaster(assetManager,offer.count,offer.count));
            masterIndex= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].length-1;
        } else {
            revert StreamLibrary.InvalidTokenType();
        }
        StreamLibrary.State currentState = assetManager.state;
        if (currentState == StreamLibrary.State.RENT) {
            assetManager.state = StreamLibrary.State.SALE_AND_RENT;
        } else if (currentState == StreamLibrary.State.STALE) {
            assetManager.state = StreamLibrary.State.SALE_AND_STALE;
        } else if (currentState == StreamLibrary.State.INIT) {
            assetManager.initializer=msg.sender;
            assetManager.state = StreamLibrary.State.SALE;
        } else if(currentState == StreamLibrary.State.SALE){
            assetManager.initializer=msg.sender;
        } else {
            revert StreamLibrary.InvalidAssetState();
        }

        assetManager.saleState = StreamLibrary.SaleState({
            salePrice: offer.amount,
            seller: msg.sender
        });
        if(tokenType == StreamLibrary.TokenType.ERC721){
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId]= assetManager;
        } else{
            StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager= assetManager;
        }
        emit StreamLibrary.ListForSale(
            tokenAddress,
            tokenId,
            offer.amount,
            offer.count,
            masterIndex,
            msg.sender
        );
    }

    function buyNFT(address tokenAddress, uint256 tokenId, uint256 masterIndex, uint256 count) external payable nonReentrant{
        StreamLibrary.AssetManager memory assetManager;
        StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(
            tokenAddress
        );

        if (tokenType == StreamLibrary.TokenType.ERC721) {
            assetManager= StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        } else{
            assetManager= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager;
        }
        StreamLibrary.State currentState = assetManager.state; // Store locally

        uint256 salePrice = assetManager.saleState.salePrice * count;
        uint256 saleFee = StreamStorage.getFeeConfig().standardFee[StreamLibrary.FeeType.SaleFee];

        uint fee = (salePrice * saleFee) / PERCENTAGE_DIVISOR;
        (bool hasRoyaltySupport) = IERC165(tokenAddress).supportsInterface(INTERFACE_ID_ERC2981);
        address royaltyAddress;
        uint256 royaltyAmount;
        if(hasRoyaltySupport){
            (royaltyAddress, royaltyAmount) = IERC2981(tokenAddress).royaltyInfo(tokenId, salePrice);
        } else{
            ( royaltyAddress, royaltyAmount) = (address(0), 0);
        }
        uint256 total= salePrice + fee + royaltyAmount;
        if (msg.value > total) {
            payable(msg.sender).transfer(msg.value - (total));
        } else if (msg.value < total) {
            revert StreamLibrary.InsufficientFunds(msg.value, total);
        }
        address seller = assetManager.saleState.seller;
        
        if(seller!=assetManager.initializer){
            revert StreamLibrary.InvalidListing();
        }

        if(tokenType == StreamLibrary.TokenType.ERC721){
            if (currentState == StreamLibrary.State.SALE) {
                assetManager.initializer = address(0);
                assetManager.state = StreamLibrary.State.INIT;
                StreamLibrary.transferToken(
                    seller,
                    msg.sender,
                    tokenAddress,
                    tokenId,
                    false,
                    false,
                    1
                );
            } else if (currentState == StreamLibrary.State.SALE_AND_RENT) {
                assetManager.state = StreamLibrary.State.RENT;
                assetManager.initializer = msg.sender;
            } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
                assetManager.state = StreamLibrary.State.STALE;
                assetManager.initializer = msg.sender;
            } else {
                revert StreamLibrary.InvalidAssetState();
            }
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId]= assetManager;
        } else{
            if(StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available<count){
                revert StreamLibrary.InvalidTokenAmount();
            }
            StreamLibrary.transferToken(
                    seller,
                    msg.sender,
                    tokenAddress,
                    tokenId,
                    false,
                    false,
                    count
                );
            StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available-=count;
        }    

        emit StreamLibrary.PurchaseNFT(
            tokenAddress,
            tokenId,
            salePrice,
            count,
            masterIndex,
            msg.sender
        );

        if(fee>0){
            payable(StreamStorage.getConfig().streamTreasury).transfer(fee);
        }
        if(royaltyAmount>0){
            payable(royaltyAddress).transfer(royaltyAmount);
        }
        payable(seller).transfer(salePrice);    
    }

    function cancelList(address tokenAddress, uint256 tokenId, uint256 masterIndex, uint256 count) external nonReentrant{
        StreamLibrary.AssetManager memory assetManager;
        StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(tokenAddress);

        if (tokenType == StreamLibrary.TokenType.ERC721) {
            assetManager= StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
        } else{
            assetManager= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager;
        }

        if (assetManager.initializer != msg.sender) {
            revert StreamLibrary.InvalidUser();
        }

        if(tokenType == StreamLibrary.TokenType.ERC721){
            StreamLibrary.State currentState = assetManager.state; // Store locally
            if (currentState == StreamLibrary.State.SALE_AND_RENT) {
                assetManager.state = StreamLibrary.State.RENT;
            } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
                assetManager.state = StreamLibrary.State.STALE;
            } else if (currentState == StreamLibrary.State.SALE) {
                // if owned due to rental expire/cancel
                if(StreamLibrary.checkOwner(tokenAddress, tokenId, address(this),1)){
                    StreamLibrary.transferToken(
                    address(this),
                    msg.sender,
                    tokenAddress,
                    tokenId,
                    false,
                    false,
                    1
                );
                }
                assetManager.state = StreamLibrary.State.INIT;
            } else {
                revert StreamLibrary.InvalidAssetState();
            }
            StreamStorage.getMapping().assetManager[tokenAddress][tokenId]= assetManager;
        } else{
            StreamLibrary.State currentState = assetManager.state; // Store locally
            if(StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available<count){
                revert StreamLibrary.InvalidTokenAmount();
            }
            if (currentState == StreamLibrary.State.SALE_AND_RENT) {
                assetManager.state = StreamLibrary.State.RENT;
            } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
                assetManager.state = StreamLibrary.State.STALE;
            } else if (currentState == StreamLibrary.State.SALE) {
                //TODO: return assets when removed from rental or loan, sale only take approval no NFT return
                // // if owned due to rental expire/cancel
                // if(StreamLibrary.checkOwner(tokenAddress, tokenId, address(this),count)){
                //     StreamLibrary.transferToken(
                //             address(this),
                //             msg.sender,
                //             tokenAddress,
                //             tokenId,
                //             false,
                //             false,
                //             count
                //         );
                // }
                assetManager.state = StreamLibrary.State.INIT;
            } else {
                revert StreamLibrary.InvalidAssetState();
            }
            StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available-=count;
        }

        emit StreamLibrary.SaleCancelled(tokenAddress, tokenId, count, masterIndex, msg.sender);
    }

    function proposeBid(
        address tokenAddress,
        uint256 tokenId,
        StreamLibrary.BuyOffer memory offer
    ) external nonReentrant {
        StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(
            tokenAddress
        );

        if (tokenType == StreamLibrary.TokenType.ERC721 && offer.count != 1) {
            revert StreamLibrary.InvalidOffer();
        }
        if (
            StreamStorage
            .getMapping()
            .buyOffers[tokenAddress][tokenId][msg.sender].isInitialized
        ) {
            revert StreamLibrary.InvalidOffer();
        }
        
  
        if (offer.paymentToken == address(0)) {
            revert StreamLibrary.InvalidOffer();
        }
        

        uint256 totalAmount = offer.amount * offer.count;
        IERC20 paymentToken = IERC20(offer.paymentToken);
        if (paymentToken.allowance(msg.sender, address(this)) < totalAmount) {
            revert StreamLibrary.InsufficientAuthorization();
        }
        
        offer.isInitialized = true;
        StreamStorage.getMapping().buyOffers[tokenAddress][tokenId][
            msg.sender
        ] = offer;
        
        emit StreamLibrary.ProposeBid(
            tokenAddress,
            tokenId,
            offer.amount,
            offer.count,
            msg.sender
        );
    }

    function revokeBid(
        address tokenAddress,
        uint256 tokenId
    ) external nonReentrant {
        StreamLibrary.BuyOffer storage bid = StreamStorage
            .getMapping()
            .buyOffers[tokenAddress][tokenId][msg.sender];
        if (!bid.isInitialized) {
            revert StreamLibrary.InvalidOffer();
        }     


        delete StreamStorage.getMapping().buyOffers[tokenAddress][tokenId][msg.sender];
        emit StreamLibrary.RevokeBid(tokenAddress, tokenId, msg.sender);
    }

    function acceptBid(
        address tokenAddress,
        uint256 tokenId,
        address buyer
    ) external nonReentrant {
        StreamLibrary.AssetManager storage assetManager = StreamStorage
            .getMapping()
            .assetManager[tokenAddress][tokenId];

        StreamLibrary.State currentState = assetManager.state;

        if (
            currentState != StreamLibrary.State.SALE &&
            currentState != StreamLibrary.State.SALE_AND_RENT &&
            currentState != StreamLibrary.State.SALE_AND_STALE &&
            currentState != StreamLibrary.State.INIT
        ) {
            revert StreamLibrary.InvalidAssetState();
        }

        address seller = assetManager.saleState.seller;
        if (seller != msg.sender || assetManager.initializer != msg.sender) {
            revert StreamLibrary.InvalidListing();
        }

        StreamLibrary.BuyOffer memory offer = StreamStorage
            .getMapping()
            .buyOffers[tokenAddress][tokenId][buyer];
        if (!offer.isInitialized) {
            revert StreamLibrary.InvalidOffer();
        }

        uint256 salePrice = offer.amount * offer.count;
        uint256 saleFee = StreamStorage.getFeeConfig().standardFee[StreamLibrary.FeeType.SaleFee];

        uint fee = (salePrice * saleFee) / PERCENTAGE_DIVISOR;
        (bool hasRoyaltySupport) = IERC165(tokenAddress).supportsInterface(INTERFACE_ID_ERC2981);
        address royaltyAddress;
        uint256 royaltyAmount;
        if(hasRoyaltySupport){
            (royaltyAddress, royaltyAmount) = IERC2981(tokenAddress).royaltyInfo(tokenId, salePrice);
        } else{
            ( royaltyAddress, royaltyAmount) = (address(0), 0);
        }        
        //  erc20 from buyer to seller
        IERC20(offer.paymentToken).safeTransferFrom(buyer, seller, salePrice);
        IERC20(offer.paymentToken).safeTransferFrom(buyer, StreamStorage.getConfig().streamTreasury, fee);
        IERC20(offer.paymentToken).safeTransferFrom(buyer, royaltyAddress, royaltyAmount);

        // Update asset manager state
        assetManager.initializer = buyer;
        if (currentState == StreamLibrary.State.SALE || currentState == StreamLibrary.State.INIT) {
            StreamLibrary.transferToken(
                seller,
                buyer,
                tokenAddress,
                tokenId,
                false,
                false,
                offer.count
            );
            assetManager.state = StreamLibrary.State.INIT;
        } else if (currentState == StreamLibrary.State.SALE_AND_RENT) {
            assetManager.state = StreamLibrary.State.RENT;
        } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
            assetManager.state = StreamLibrary.State.STALE;
        }
        // Remove the accepted offer from the offers mapping
        delete StreamStorage.getMapping().buyOffers[tokenAddress][tokenId][buyer];
        emit StreamLibrary.BidAccepted(tokenAddress, tokenId, seller, buyer);
    }
}
