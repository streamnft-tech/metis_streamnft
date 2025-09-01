pragma solidity ^0.8.4;

import "../libraries/StreamStorage.sol";
import "../libraries/StreamLibrary.sol";
import "../libraries/ERC6551RegistryLib.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract Getter {

    // for getMapping: getters
    function getDiscount(address userOrProtocol, StreamLibrary.State _state) external view returns (uint) {
        return StreamStorage.getMapping().discount[userOrProtocol][_state];
    }

    function getPartnerConfig(address _address) external view returns (
        StreamLibrary.Treasury memory,
        StreamLibrary.Treasury memory,
        bool) {
        StreamLibrary.PartnerConfig storage config= StreamStorage.getMapping().partnerConfig[_address];
        return (config.treasury[StreamLibrary.State.RENT],config.treasury[StreamLibrary.State.LOAN],config.doMint);
    }

    function getLoanPoolList() external view returns (StreamLibrary.LoanPool[] memory) {
        return StreamStorage.getMapping().loanPoolList.loanPools;
    }

    function getLoanPoolLength() external view returns (uint256) {
        return StreamStorage.getMapping().loanPoolList.loanPools.length;
    }

    function getLoanPool(uint _index) external view returns (StreamLibrary.LoanPool memory) {
        return StreamStorage.getMapping().loanPoolList.loanPools[_index];
    }

    // @param loanPoolIndex : loanPool index
    // @notice returns array of loanOffers
    function getLoanOfferList(uint256 loanPoolIndex) external view returns(StreamLibrary.LoanOffer[] memory){
        return StreamStorage.getMapping().loanOfferList[loanPoolIndex].loanOffers;
    }

    function getLoanOffer(uint poolIndex, uint256 offerIndex) external view returns (StreamLibrary.LoanOffer memory) {
        return StreamStorage.getMapping().loanOfferList[poolIndex].loanOffers[offerIndex];
    }
    
    function getAssetManager(address tokenAddress, uint tokenId) external view returns (StreamLibrary.AssetManager memory) {
        return StreamStorage.getMapping().assetManager[tokenAddress][tokenId];
    }

    function getFungibleAssetMaster(address tokenAddress, uint tokenId, uint256 index) external view returns (StreamLibrary.AssetManager memory) {
        return StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId][index].assetManager;
    }

    function getFungibleAssetManagerByIndex(address tokenAddress, uint tokenId, uint256 index) external view returns (StreamLibrary.AssetManager memory) {
        return StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId][index];
    }

    function getNFTPool(address tokenAddress, uint tokenId, uint256 index) external view returns (StreamLibrary.NFTPool memory) {
        return StreamStorage
            .getMapping().nftPools[tokenAddress][tokenId][index];
    }

    function getTokenMap(address tokenAddress, uint tokenId) external view returns (uint) {
        return StreamStorage.getMapping().tokenMap[tokenAddress][tokenId];
    }
    
    // function getStreamRentalFee() external view returns (uint256) {
    //     return StreamStorage.getConfig().streamRentalFee;
    // }

    // function getStreamTreasury() external view returns (address) {
    //     return StreamStorage.getConfig().streamTreasury;
    // }

    function getStreamConfig() external pure returns (StreamStorage.StreamConfig memory) {
        return StreamStorage.getConfig();
    }

    function getFungibleMasterSize(address tokenAddress, uint256 tokenId) external view returns (uint256) {
        return StreamStorage.getMapping().fungibleAssetMaster[tokenAddress][tokenId].length;
    }

    function getFungibleAssetSize(address tokenAddress, uint256 tokenId) external view returns (uint256) {
        return StreamStorage.getMapping().fungibleAssetManager[tokenAddress][tokenId].length;
    }

    function getAccessRegisterList() external view returns (StreamLibrary.AccessRegister[] memory) {
        return StreamStorage.getMapping().accessRegisterList.accessRegister;
    }

    function getContentExpiry(uint index, address user) external view returns (uint) {
        return StreamStorage.getMapping().expiry[index][user].contentExpiry;
    }

    function getModuleExpiry(uint index, address user, uint individualIndex) external view returns (uint) {
        return StreamStorage.getMapping().expiry[index][user].moduleExpiry[individualIndex];
    }

    function getTBAaccount(
        address tokenContract,
        uint256 tokenId
    ) public view returns (address) {
        return ERC6551RegistryLib.getAccount(StreamStorage.getMapping().implementation.tba, bytes32(0), block.chainid, tokenContract, tokenId);
    }

    function getImplementation() external view returns (StreamLibrary.Implementation memory) {
        return StreamStorage.getMapping().implementation;
    }

    function getCourseDeterministicAddress(bytes32 salt) external view returns (address) {
        return Clones.predictDeterministicAddress(StreamStorage.getMapping().implementation.courseCollection, salt, address(this));
    }

    function getRegistryByIndex(uint256 index) external view returns (StreamLibrary.AccessRegister memory) {
        return StreamStorage.getMapping().accessRegisterList.accessRegister[index];
    }

    function getLauncpadImplementation() external view returns (StreamLibrary.LaunchpadImplementation memory) {
        return StreamStorage.getMapping().launchpadImplementation;
    }
    function getAdmin() external view returns (address) {
        return StreamStorage.getConfig().admin;
    }

    // function getStreamCollection() external view returns (address) {
    //     return StreamStorage.getConfig().streamCollection;
    // }

    function isAccessTokenValid(uint256 index, uint256[] calldata tokenIds) external view returns (bool) {
        StreamStorage.StreamMapping storage s = StreamStorage.getMapping();
        uint256 currentTime = block.timestamp; // Cache block.timestamp to save gas
        uint256 len = tokenIds.length;
        for (uint256 i = 0; i < len; ++i) {
            if (s.accessTokenExpiry[index][tokenIds[i]].contentExpiry > currentTime) {
                return true; // Return early if any token is still valid
            }
        }
        return false; // All tokens are expired
    }

    function getAccessTokenExpiry(uint256 index, uint256 tokenId) external view returns (uint256) {
        return StreamStorage.getMapping().accessTokenExpiry[index][tokenId].contentExpiry;
    }

    function getContentByIndex(uint256 index) 
        external 
        view 
        returns (
            address[] memory, uint[] memory, uint[] memory, uint, address, 
            bool, bool, uint256, bool, address
        ) 
    {
        StreamLibrary.AccessRegister storage accessRegister = StreamStorage.getMapping().accessRegisterList.accessRegister[index];
        return (
            accessRegister.tokenAddresses,
            accessRegister.tokenIds,
            accessRegister.modulePrice,
            accessRegister.contentPrice,
            accessRegister.accessCollection,
            accessRegister.isSameCollection,
            accessRegister.mintAccessNFT,
            accessRegister.expiry,
            accessRegister.mintCertificate,
            accessRegister.certificateCollection
        );
    }

    function getStandardFee(StreamLibrary.FeeType feeType) external view returns (uint256) {
        return StreamStorage.getFeeConfig().standardFee[feeType];
    }

    function getCustomFee(address tokenAddress, StreamLibrary.FeeType feeType) external view returns (bool, uint256) {
        return (
            StreamStorage.getFeeConfig().customFee[tokenAddress][feeType].isCustomFee,
            StreamStorage.getFeeConfig().customFee[tokenAddress][feeType].fee
        );
    }

    function getFeeConfig(StreamLibrary.LaunchpadTokenType tokenType) external view returns (StreamLibrary.MintFee memory){
        return StreamStorage.getFeeConfig().mintFee[tokenType];
    }

}