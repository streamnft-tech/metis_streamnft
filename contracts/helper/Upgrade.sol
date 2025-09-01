// pragma solidity ^0.8.4;

// import "../libraries/StreamStorage.sol";
// import "../libraries/StreamLibrary.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "../libraries/LibDiamond.sol";
// import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/utils/math/SafeMath.sol";
// import "../interfaces/IStreamNFT.sol";

// contract Upgrade{

//     /**
//      * @notice Cancel the rental of a token
//      * @param tokenAddress The address of the token
//      * @param tokenId The ID of the token
//      * @dev This function allows the cancellation of the rental of a token by providing the token address and token ID.
//      */
//     function cancelLendToken(address tokenAddress, uint tokenId) external {
//         StreamLibrary.AssetManager memory _assetManager = StreamStorage.getMapping().assetManager[tokenAddress][tokenId];

//         if(_assetManager.initializer!=msg.sender)
//             revert StreamLibrary.InvalidUser();
//         // require(_assetManager.initializer==msg.sender,"R5");
//         if(_assetManager.state!=StreamLibrary.State.STALE && _assetManager.state!=StreamLibrary.State.STALE_AND_LOAN)
//             revert StreamLibrary.AlreadyRentedOut();
//         // require(_assetManager.state==StreamLibrary.State.STALE || _assetManager.state==StreamLibrary.State.STALE_AND_LOAN, "R6");
        
//         if( _assetManager.state==StreamLibrary.State.STALE ){ 
//             _assetManager.state=StreamLibrary.State.INIT; 
//             _assetManager.initializer=address(0);
//         } else{
//             _assetManager.state=StreamLibrary.State.LOAN; 
//         }
//         //update storage
//         StreamStorage.getMapping().assetManager[tokenAddress][tokenId] = _assetManager;
//         emit StreamLibrary.CancelLendToken(tokenAddress, tokenId, msg.sender);
//         if (_assetManager.state==StreamLibrary.State.INIT){
//             StreamLibrary.transferToken(address(this),msg.sender,tokenAddress,tokenId,false,false);
//         }
//     }
// } 