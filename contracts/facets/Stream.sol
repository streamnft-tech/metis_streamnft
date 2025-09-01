pragma solidity ^0.8.4;

import "../libraries/StreamStorage.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/StreamLibrary.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../libraries/LibDiamond.sol";

contract Stream is ERC721Holder,ERC1155Holder{

    using SafeMath for uint256;
    
    //done: another parameter: streamSFT
    function setupConfig(uint256 rentalFee, address streamNFT, address streamSFT, address treasury, address admin
    ,uint256 loanDiscount, uint256 rentalDiscount, uint256 withdrawFee) external{
        StreamStorage.StreamConfig storage config = StreamStorage.getConfig();
        if(config.admin!=address(0)){
            require(msg.sender==config.admin, "Admin required");
        } else{
            require(msg.sender == LibDiamond.diamondStorage().contractOwner, "LibDiamond: Must be contract owner");
        }
        require(loanDiscount<100 && rentalDiscount<100,"Discount must be in 0-100");
        config.streamNFT=streamNFT;
        config.streamRentalFee= rentalFee;
        config.streamTreasury = treasury;
        config.admin=admin;
        config.loanDiscount=loanDiscount;
        config.rentalDiscount=rentalDiscount;
        config.withdrawFee=withdrawFee;
        config.streamSFT=streamSFT;
    }

    modifier checkAdmin(){
        if(msg.sender!=StreamStorage.getConfig().admin) revert StreamLibrary.RequiredAdmin();
        _;
    }

    // @notice Update discount for projects
    // @param value for project discount
    function updateStreamLoanFee(uint256 index, uint256 value) checkAdmin() external {
        StreamStorage.getMapping().loanPoolList.loanPools[index].interestRateProtocol=value;
    }

    function updateLoanPool(uint256 _index, StreamLibrary.LoanPool memory pool) checkAdmin() external{
        StreamStorage.getMapping().loanPoolList.loanPools[_index]=pool;
    }

    function updateStreamConfig(
        address admin, address treasury, uint256 loanDiscount, uint256 rentDiscount, uint256 rentalFee
        ) checkAdmin() external {
        StreamStorage.StreamConfig storage config = StreamStorage.getConfig();
        config.admin=admin;
        config.streamTreasury=treasury;
        config.loanDiscount=loanDiscount;
        config.rentalDiscount=rentDiscount;
        config.streamRentalFee=rentalFee;
    }

    // @notice Update discount for projects
    // @param tokenAddress for project NFT collection
    // @param value for project discount
    function updateDiscount(address tokenAddress, StreamLibrary.State state, uint value) checkAdmin() external {
        //done: check discount value 0-100
        StreamStorage.getMapping().discount[tokenAddress][state]=value;
    }

    // @notice Update discount for projects
    // @param tokenAddress for project NFT collection
    // @param Fee object for project
    function updatePartnerConfig(address tokenAddress, StreamLibrary.Treasury calldata rent, 
    StreamLibrary.Treasury calldata loan, bool doMint) checkAdmin() external {
        StreamLibrary.PartnerConfig storage config = StreamStorage.getMapping().partnerConfig[tokenAddress];
        config.treasury[StreamLibrary.State.RENT]=rent;
        config.treasury[StreamLibrary.State.LOAN]=loan;
        config.doMint=doMint;
    }

    
    // function updatePartnerConfig(address tokenAddress, StreamLibrary.PartnerConfig calldata config) checkAdmin() external {
    //     StreamStorage.getMapping().partnerConfig[tokenAddress]=config;
    // }

    function updateNFTDiscount(address tokenAddress, uint256 rent, uint256 loan) external {
        //done: check discount value 0-100
        StreamStorage.getMapping().nftDiscount[tokenAddress][StreamLibrary.State.RENT] = rent;
        StreamStorage.getMapping().nftDiscount[tokenAddress][StreamLibrary.State.LOAN] = loan;
    }
        

    receive() external payable {}

    fallback() external payable {}

    function updateFee(
        StreamLibrary.FeeType feeType,
        uint256 fee 
    ) external checkAdmin(){
       StreamStorage.FeeConfig storage config = StreamStorage.getFeeConfig();
       config.standardFee[feeType]=fee;
    }

    function setupStandardFeeConfig(
        uint256 contentCreationFee,     // constant
        uint256 contentAccessFee,       // in %
        uint256 contentAccessFlatFee,   // constant 
        uint256 launchPadFee,           // constant
        uint256 mintFee,                // in %
        uint256 saleFee                 // in %
    ) external checkAdmin() {
        StreamStorage.FeeConfig storage config = StreamStorage.getFeeConfig();
        config.standardFee[StreamLibrary.FeeType.ContentCreationFee] = contentCreationFee;
        config.standardFee[StreamLibrary.FeeType.ContentAccessFee] = contentAccessFee;
        config.standardFee[StreamLibrary.FeeType.ContentAccessFlatFee] = contentAccessFlatFee;
        config.standardFee[StreamLibrary.FeeType.LaunchPadFee] = launchPadFee;
        config.standardFee[StreamLibrary.FeeType.MintFee] = mintFee;
        config.standardFee[StreamLibrary.FeeType.SaleFee] = saleFee;
    }

    function setupCustomFee(
        address user,
        StreamLibrary.FeeType feeType,
        bool isCustomFee,
        uint256 fee 
    ) external checkAdmin() {
        StreamStorage.FeeConfig storage config = StreamStorage.getFeeConfig();
        config.customFee[user][feeType].isCustomFee = isCustomFee;
        config.customFee[user][feeType].fee = fee;
    }
}
