// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.2;

// import "../libraries/StreamStorage.sol";
// import "../libraries/StreamLibrary.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// import "hardhat/console.sol";

// contract SaleUtil2 is ReentrancyGuard {

//     function listForSale(address tokenAddress, uint256 tokenId, StreamLibrary.BuyOffer memory offer) external nonReentrant{
//         if(! StreamLibrary.checkOwner(tokenAddress, tokenId, msg.sender, offer.count) ){
//             revert StreamLibrary.InvalidUser();
//         }
//         StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(
//             tokenAddress
//         );

//         if (
//             tokenType != StreamLibrary.TokenType.ERC721 &&
//             tokenType != StreamLibrary.TokenType.ERC1155
//         ) revert StreamLibrary.InvalidTokenType();

//         StreamLibrary.AssetManager memory assetManager;
//         uint256 masterIndex;

//         if (tokenType == StreamLibrary.TokenType.ERC721) {
//             if (
//                 IERC721(tokenAddress).getApproved(tokenId) != address(this) &&
//                 !IERC721(tokenAddress).isApprovedForAll(
//                     msg.sender,
//                     address(this)
//                 )
//             ) {
//                 revert StreamLibrary.InsufficientAuthorization();
//             }
//             assetManager= StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
//         } else if (tokenType == StreamLibrary.TokenType.ERC1155) {
//             if (
//                 !IERC1155(tokenAddress).isApprovedForAll(
//                     msg.sender,
//                     address(this)
//                 )
//             ) {
//                 revert StreamLibrary.InsufficientAuthorization();
//             }
//             StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].push(StreamLibrary.FungibleAssetMaster(assetManager,offer.count,offer.count));
//             masterIndex= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].length-1;
//         } else {
//             revert StreamLibrary.InvalidTokenType();
//         }
//         StreamLibrary.State currentState = assetManager.state;
//         if (currentState == StreamLibrary.State.RENT) {
//             assetManager.state = StreamLibrary.State.SALE_AND_RENT;
//         } else if (currentState == StreamLibrary.State.STALE) {
//             assetManager.state = StreamLibrary.State.SALE_AND_STALE;
//         } else if (currentState == StreamLibrary.State.INIT) {
//             assetManager.initializer=msg.sender;
//             assetManager.state = StreamLibrary.State.SALE;
//         } else if(currentState == StreamLibrary.State.SALE){
//             assetManager.initializer=msg.sender;
//         } else {
//             revert StreamLibrary.InvalidAssetState();
//         }

//         assetManager.saleState = StreamLibrary.SaleState({
//             salePrice: offer.amount,
//             seller: msg.sender
//         });
//         if(tokenType == StreamLibrary.TokenType.ERC721){
//             StreamStorage.getMapping().assetManager[tokenAddress][tokenId]= assetManager;
//         } else{
//             StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager= assetManager;
//         }
//         emit StreamLibrary.ListForSale(
//             tokenAddress,
//             tokenId,
//             offer.amount,
//             offer.count,
//             masterIndex,
//             msg.sender
//         );
//     }

//     function buyNFT(address tokenAddress, uint256 tokenId, uint256 masterIndex, uint256 count) external payable nonReentrant{
//         StreamLibrary.AssetManager memory assetManager;
//         StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(
//             tokenAddress
//         );

//         if (tokenType == StreamLibrary.TokenType.ERC721) {
//             assetManager= StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
//         } else{
//             assetManager= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager;
//         }

//         uint256 salePrice = assetManager.saleState.salePrice*count;

//         address seller = assetManager.saleState.seller;
//         StreamLibrary.State currentState = assetManager.state; // Store locally
//         if(seller!=assetManager.initializer){
//             revert StreamLibrary.InvalidListing();
//         }
        
//         IERC20(StreamStorage.getConfig().defaultPayment).safeTransferFrom(
//             msg.sender,
//             address(this),
//             salePrice
//         );

//         if(tokenType == StreamLibrary.TokenType.ERC721){
//             if (currentState == StreamLibrary.State.SALE) {
//                 assetManager.initializer = address(0);
//                 assetManager.state = StreamLibrary.State.INIT;
//                 StreamLibrary.transferToken(
//                     seller,
//                     msg.sender,
//                     tokenAddress,
//                     tokenId,
//                     false,
//                     false,
//                     1
//                 );
//             } else if (currentState == StreamLibrary.State.SALE_AND_RENT) {
//                 assetManager.state = StreamLibrary.State.RENT;
//                 assetManager.initializer = msg.sender;
//             } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
//                 assetManager.state = StreamLibrary.State.STALE;
//                 assetManager.initializer = msg.sender;
//             } else {
//                 revert StreamLibrary.InvalidAssetState();
//             }
//             StreamStorage.getMapping().assetManager[tokenAddress][tokenId]= assetManager;
//         } else{
//             if(StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available<count){
//                 revert StreamLibrary.InvalidTokenAmount();
//             }
//             StreamLibrary.transferToken(
//                     seller,
//                     msg.sender,
//                     tokenAddress,
//                     tokenId,
//                     false,
//                     false,
//                     count
//                 );
//             StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available-=count;
//         }        

//         emit StreamLibrary.PurchaseNFT(
//             tokenAddress,
//             tokenId,
//             salePrice,
//             count,
//             masterIndex,
//             msg.sender
//         );
//     }

//     function cancelList(address tokenAddress, uint256 tokenId, uint256 masterIndex, uint256 count) external nonReentrant{
//         StreamLibrary.AssetManager memory assetManager;
//         StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(tokenAddress);

//         if (tokenType == StreamLibrary.TokenType.ERC721) {
//             assetManager= StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
//         } else{
//             assetManager= StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].assetManager;
//         }

//         if (assetManager.initializer != msg.sender) {
//             revert StreamLibrary.InvalidUser();
//         }

//         if(tokenType == StreamLibrary.TokenType.ERC721){
//             StreamLibrary.State currentState = assetManager.state; // Store locally
//             if (currentState == StreamLibrary.State.SALE_AND_RENT) {
//                 assetManager.state = StreamLibrary.State.RENT;
//             } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
//                 assetManager.state = StreamLibrary.State.STALE;
//             } else if (currentState == StreamLibrary.State.SALE) {
//                 // if owned due to rental expire/cancel
//                 if(StreamLibrary.checkOwner(tokenAddress, tokenId, address(this),1)){
//                     StreamLibrary.transferToken(
//                     address(this),
//                     msg.sender,
//                     tokenAddress,
//                     tokenId,
//                     false,
//                     false,
//                     1
//                 );
//                 }
//                 assetManager.state = StreamLibrary.State.INIT;
//             } else {
//                 revert StreamLibrary.InvalidAssetState();
//             }
//             StreamStorage.getMapping().assetManager[tokenAddress][tokenId]= assetManager;
//         } else{
//             if(StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available<count){
//                 revert StreamLibrary.InvalidTokenAmount();
//             }
//             StreamLibrary.transferToken(
//                     address(this),
//                     msg.sender,
//                     tokenAddress,
//                     tokenId,
//                     false,
//                     false,
//                     count
//                 );
//             StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][masterIndex].available-=count;
//         }

//         emit StreamLibrary.SaleCancelled(tokenAddress, tokenId, count, masterIndex, msg.sender);
//     }

//     function proposeBid(
//         address tokenAddress,
//         uint256 tokenId,
//         StreamLibrary.BuyOffer memory offer
//     ) external nonReentrant {
//         StreamLibrary.TokenType tokenType = StreamLibrary.checkTokenType(
//             tokenAddress
//         );

//         if (tokenType == StreamLibrary.TokenType.ERC721 && offer.count != 1) {
//             revert StreamLibrary.InvalidOffer();
//         }
//         if (
//             StreamStorage
//             .getMapping()
//             .buyOffers[tokenAddress][tokenId][msg.sender].isInitialized
//         ) {
//             revert StreamLibrary.InvalidOffer();
//         }
//         offer.isInitialized = true;
//         StreamStorage.getMapping().buyOffers[tokenAddress][tokenId][
//             msg.sender
//         ] = offer;

        
//         StreamLibrary.checkErrorInsufficientFunds(offer.amount*offer.count);

//         emit StreamLibrary.ProposeBid(
//             tokenAddress,
//             tokenId,
//             offer.amount,
//             offer.count,
//             msg.sender
//         );
//     }

//     function revokeBid(
//         address tokenAddress,
//         uint256 tokenId
//     ) external nonReentrant {
//         StreamLibrary.BuyOffer storage bid = StreamStorage
//             .getMapping()
//             .buyOffers[tokenAddress][tokenId][msg.sender];
//         if (!bid.isInitialized) {
//             revert StreamLibrary.InvalidOffer();
//         }
//         payable(msg.sender).transfer(bid.amount*bid.count);
//         delete StreamStorage.getMapping().buyOffers[tokenAddress][tokenId][msg.sender];
//         emit StreamLibrary.RevokeBid(tokenAddress, tokenId, msg.sender);
//     }

//     function acceptBid(
//         address tokenAddress,
//         uint256 tokenId,
//         address buyer
//     ) external nonReentrant {
//         StreamLibrary.AssetManager storage assetManager = StreamStorage
//             .getMapping()
//             .assetManager[tokenAddress][tokenId];

//         StreamLibrary.State currentState = assetManager.state;

//         if (
//             currentState != StreamLibrary.State.SALE &&
//             currentState != StreamLibrary.State.SALE_AND_RENT &&
//             currentState != StreamLibrary.State.SALE_AND_STALE &&
//             currentState != StreamLibrary.State.INIT
//         ) {
//             revert StreamLibrary.InvalidAssetState();
//         }

//         address seller = assetManager.saleState.seller;
//         if (seller != msg.sender || assetManager.initializer != msg.sender) {
//             revert StreamLibrary.InvalidListing();
//         }

//         StreamLibrary.BuyOffer memory offer = StreamStorage
//             .getMapping()
//             .buyOffers[tokenAddress][tokenId][buyer];
//         if (!offer.isInitialized) {
//             revert StreamLibrary.InvalidOffer();
//         }

//         payable(seller).transfer(offer.amount*offer.count);

//         // Update asset manager state
//         assetManager.initializer = buyer;
//         if (currentState == StreamLibrary.State.SALE || currentState == StreamLibrary.State.INIT) {
//             StreamLibrary.transferToken(
//                 seller,
//                 buyer,
//                 tokenAddress,
//                 tokenId,
//                 false,
//                 false,
//                 offer.count
//             );
//             assetManager.state = StreamLibrary.State.INIT;
//         } else if (currentState == StreamLibrary.State.SALE_AND_RENT) {
//             assetManager.state = StreamLibrary.State.RENT;
//         } else if (currentState == StreamLibrary.State.SALE_AND_STALE) {
//             assetManager.state = StreamLibrary.State.STALE;
//         }
//         // Remove the accepted offer from the offers mapping
//         delete StreamStorage.getMapping().buyOffers[tokenAddress][tokenId][buyer];
//         emit StreamLibrary.BidAccepted(tokenAddress, tokenId, seller, buyer);
//     }
// }
