// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.4;

import "./StreamLibrary.sol";

library StreamStorage {

    struct StreamMapping {
        mapping(address=> mapping(uint256 => StreamLibrary.AssetManager)) assetManager;
        mapping(address=>mapping(uint256=>uint256)) tokenMap;
        StreamLibrary.loanPools loanPoolList;
        mapping(uint256=>StreamLibrary.loanOffers) loanOfferList; 
        mapping(address=>mapping(StreamLibrary.State=>uint256)) discount;
        mapping(address=>StreamLibrary.PartnerConfig) partnerConfig;
        mapping(address=> mapping(uint256 => mapping(uint256=>StreamLibrary.NFTPool))) nftPools;
        mapping(address=>mapping(StreamLibrary.State=>uint256)) nftDiscount;
        mapping(address=> mapping(uint256 => StreamLibrary.FungibleAssetMaster[])) fungibleAssetMaster;
        mapping(address=> mapping(uint256 => StreamLibrary.AssetManager[])) fungibleAssetManager;
        mapping(address=>mapping(uint256=>bool)) isMinted;
        mapping(address=> mapping(uint256=> mapping(uint256=>StreamLibrary.MasterMap))) assetToMasterMap;
        mapping(address => mapping(uint256 => mapping(address => StreamLibrary.BuyOffer))) buyOffers; //Deprecate
        StreamLibrary.accessRegister accessRegisterList;
        mapping(uint => mapping(address => StreamLibrary.Expiry)) expiry;
        StreamLibrary.Implementation implementation;
        StreamLibrary.LaunchpadImplementation launchpadImplementation;
        mapping(uint => mapping(uint256 => StreamLibrary.Expiry)) accessTokenExpiry;
        // mapping(address => mapping(uint => address)) individualAccessCollection;
    }

    function getMapping() internal pure returns(StreamMapping storage ds) {
        bytes32 storagePosition = keccak256("diamond.stream.mapping");
        assembly {
            ds.slot := storagePosition
        }
    }

    struct StreamConfig{
        address streamNFT;
        address streamSFT;
        uint256 streamRentalFee;
        address streamTreasury;
        address admin;
        uint256 loanDiscount;   
        uint256 rentalDiscount;
        uint256 streamLoanFee;
        uint256 withdrawFee;
    }

    struct FeeConfig {
        mapping(StreamLibrary.FeeType => uint256) standardFee;
        mapping(address => mapping(StreamLibrary.FeeType => CustomFeeDetail)) customFee;
        mapping(StreamLibrary.LaunchpadTokenType => StreamLibrary.MintFee) mintFee;
    }

    struct CustomFeeDetail {
        bool isCustomFee;
        uint256 fee;        // multiplied by decimal multiplier
    }

    function getConfig() internal pure returns(StreamConfig storage ds) {
        bytes32 storagePosition = keccak256("diamond.stream.config");
        assembly {
            ds.slot := storagePosition
            }
    }

    function getFeeConfig() internal pure returns(FeeConfig storage ds) {
        bytes32 storagePosition = keccak256("diamond.fee.config");
        assembly {
            ds.slot := storagePosition
        }
    }
}