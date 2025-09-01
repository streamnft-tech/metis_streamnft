// Solidity program to demonstrate
// how to create a library
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./ERC7066.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "./StreamStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IERC7066.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IERC7066SFT.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Library Definition
library StreamLibrary {
    using SafeERC20 for IERC20;

    //enums
    enum State {
        INIT,
        RENT,
        LOAN,
        RENT_AND_LOAN,
        STALE,
        STALE_AND_LOAN,
        PRE_LOAN,
        STALE_AND_PRE_LOAN,
        RENT_AND_PRE_LOAN,
        SALE,
        SALE_AND_RENT,
        SALE_AND_STALE
    }

    enum TokenType {
        NONE,
        ERC721,
        ERC1155,
        ERC7066,
        ERC7066SFT
    }
    enum StreamConfig {
        RENTAL_FEE,
        ADMIN,
        TREASURY,
        NFT_COLLECTION,
        LOAN_DISCOUNT,
        RENT_DISCOUNT
    }

    enum FeeType {
        ContentCreationFee,     // constant fee
        ContentAccessFee,       // in % of content price
        ContentAccessFlatFee,   // constant fee
        LaunchPadFee,           // tbd
        MintFee,                // in % of mint price
        SaleFee                 // in % of sale price
    }

    enum LaunchpadTokenType {
        SoulBoundPrivate,
        ERC1155Public,
        ERC1155Private,
        ERC721Public,
        ERC721Private,
        Certificate,
        Erc7066Private,
        Erc7066Public,
        SoulBoundPublic,
        Passes,
        ERC721Advanced,
        ERC1155Advanced
    }

    //constants
    uint constant MIN_RENT_MINUTES = 1;
    uint constant DECIMAL_MULTIPLIER = 1000;

    struct loanPools {
        LoanPool[] loanPools;
    }
    struct loanOffers {
        LoanOffer[] loanOffers;
    }

    struct BuyOffer {
        uint256 amount;
        uint256 count;
        bool isInitialized;
        address paymentToken; 
    }

    struct LoanPool {
        address initializerKey;
        address tokenAddress;
        uint256 loanDurationInMinutes;
        uint256 interestRateLender; // multiplied by decimal multiplier
        uint256 interestRateProtocol;
        uint256 totalLoanOffer;
        uint256 lastBidAmount;
    }

    struct NFTPool {
        address initializerKey;
        uint256 loanDurationInMinutes;
        uint256 interestRateLender; // multiplied by decimal multiplier
        uint256 bidAmount;
        uint256 interestRateProtocol;
    }

    struct LoanOffer {
        address bidderPubkey;
        uint256 bidAmount;
        uint256 poolIndex;
        uint256 totalBids;
        uint256 pendingLoans;
    }

    struct FungibleAssetMaster {
        AssetManager assetManager;
        uint256 total;
        uint256 available;
    }

    struct AssetManager {
        address initializer;
        State state;
        LoanState loanState;
        RentState rentState;
        SaleState saleState;
    }

    struct SaleState {
        uint256 salePrice;
        address seller;
    }

    struct LoanState {
        uint256 loanPoolIndex;
        uint256 loanOfferIndex;
        uint256 loanExpiry;
        address provider;
        uint256 loanAmount;
        bool isNFTLoan;
    }

    struct RentState {
        uint256 rate;
        uint256 validityExpiry;
        bool isFixed;
        bool doMint;
        uint256 fixedMinutes;
        uint256 ownerShare;
        uint256 rentExpiry;
        address rentee;
        bytes32 merkleRoot;
    }

    struct Treasury {
        address wallet;
        uint256 fee; // multiplied by decimal multiplier
        address token;
    }
    struct PartnerConfig {
        mapping(State => Treasury) treasury;
        bool doMint;
        TokenType tokenType;
    }

    struct MasterMap {
        bool hasMapping;
        uint256 index;
    }

    struct accessRegister {
        AccessRegister[] accessRegister;
    }

    struct AccessRegister {
        address[] tokenAddresses;
        uint[] tokenIds;
        uint[] modulePrice;
        uint contentPrice;
        address accessCollection;
        bool isSameCollection;
        bool mintAccessNFT;
        uint256 expiry;
        bool mintCertificate;
        address certificateCollection;
    }

    struct Expiry {
        uint contentExpiry;
        mapping(uint => uint) moduleExpiry;
    }

    struct Implementation {
        address access;
        address tba;
        address courseCollection;
        address ipNft;
        address certificate;
        address registry6551;
    }

    struct LaunchpadImplementation {
        address erc1155Private;
        address erc1155Public;
        address erc721Public;
        address erc721Private;
        address erc7066Private;
        address erc7066Public;
        address soulBoundPrivate;
        address soulBoundPublic;
        address certificate;
        address passes;
        address erc721Advanced;
        address erc1155Advanced;
    }

    struct MintFee{
        bool initialized;
        uint256 flatFee;
        uint256 percentageFee;
    }

    struct PrivateDrop{
        address gatedTokenAddress;
        bytes32 merkleRoot;
    }

    struct DropPhase {
        uint80 mintPrice; 
        uint80 mintFee; 
        uint48 startTime; 
        uint48 endTime;
        uint256 maxSupply; 
        uint16 maxWalletMint;
        bool isTokenGated;
        bool isWhitelisted;
    }
    
    struct LaunchpadInput {
        uint96 _royaltyBps;
        DropPhase[] _dropPhases;
        PrivateDrop[] _privateDrops;
        address royaltyAddress;
    }

    // Error codes
    error InvalidInitializer();
    error InsufficientFunds(uint provided, uint required);
    error InvalidTimeDuration();
    error InvalidUser(); //R5
    error PrivateRental();
    error RequiredValidityLessThanLoan();
    error RequiredAdmin();
    error NonExistentToken(); //E1 E2
    error ExceededValidity(); //R2
    error InvalidAssetState(); //R3 R7
    error AlreadyOnRent(); //R1
    error PendingExpiry(); //L3 R4
    error AllOffersTaken(); //L2
    error RequiredMoreThanRentValdity(); //L1
    error AlreadyRentedOut(); //R6
    error OffersExist();
    error Expired();
    error InvalidTokenType();
    error InsufficientAuthorization();
    error InvalidOffer();
    error InvalidTokenAmount();
    error NotOwner();
    error InvalidListing();
    error InvalidLength();

    // Events
    event CreateLoanPool(uint256 poolIndex);

    event AddLoanOffer(
        uint256 poolIndex,
        uint256 offerIndex,
        uint256 bidAmount,
        uint256 totalBid
    );
    event UpdateOfferAmount(
        uint256 poolIndex,
        uint256 offerIndex,
        uint256 bidAmount
    );
    event UpdateOfferCount(
        uint256 poolIndex,
        uint256 offerIndex,
        uint256 totalBid
    );
    event ProcessLoan(
        address tokenAddress,
        uint256 tokenId,
        uint256 index,
        address loanProvider,
        address loanReceiver,
        uint256 loanAmount,
        uint256 expiry
    );
    event RepayLoan(
        address tokenAddress,
        uint256 tokenId,
        uint256 index,
        address loanProvider,
        address loanReceiver,
        uint256 repayAmount
    );
    event ExpireLoan(
        address tokenAddress,
        uint256 tokenId,
        address loanProvider,
        address loanReceiver
    );
    event LendToken(
        address tokenAddress,
        uint256 tokenId,
        uint256 masterIndex,
        address initalizer
    );
    event ProcessRent(
        address tokenAddress,
        uint256 tokenId,
        uint256 index,
        address owner,
        address rentee,
        uint256 rentExpiry
    );
    event ExpireRent(address tokenAddress, uint256 tokenId, address rentee);
    event CancelLendToken(
        address tokenAddress,
        uint256 tokenId,
        address initializer
    );
    event CreateNFTPool(
        address tokenAddress,
        uint256 tokenId,
        uint256 index,
        uint256 loanDurationInMinutes,
        uint256 interestRateLender,
        uint256 bidAmount
    );

    event RemoveNFTPool(address tokenAddress, uint256 tokenId);

    event AcceptOffer(
        address tokenAddress,
        uint256 tokenId,
        uint256 loanAmount
    );

    event ListForSale(
        address tokenAddress,
        uint256 tokenId,
        uint256 salePrice,
        uint256 assetCount,
        uint256 masterIndex,
        address seller
    );

    event SaleCancelled(address tokenAddress, uint256 tokenId, 
        uint256 assetCount,
        uint256 masterIndex, address seller);

    event PurchaseNFT(
            address tokenAddress,
            uint256 tokenId,
            uint256 salePrice,
            uint256 assetCount,
            uint256 masterIndex,
            address buyer
        );
    event ProposeBid(address tokenAddress, uint256 tokenId, uint256 amount, uint256 count, address bidder);
    event RevokeBid(address tokenAddress, uint256 tokenId, address bidder);
    event BidAccepted(address tokenAddress, uint256 tokenId, address seller, address buyer);
    event AddToAccessRegisterList(uint256 ipTokenId, address ipTBA, uint index, address accessCollection);
    event AccessModule(uint index, address user, uint expiry);
    event AccessIndividual(uint moduleIndex, uint individualIndex, address user, uint expiry);
    event RegisterIndividual(address tokenAddress, uint tokenId, address collection);
    event CreateContentAndIP(uint index, uint ipId, address tbaAccount, address courseCollection, address accessCollection, address certificateCollection);

    function checkErrorInsufficientFunds(uint256 amount) internal {
        // console.log("required is: ",amount );
        if (msg.value != amount) {
            revert InsufficientFunds({provided: msg.value, required: amount});
            // revert ("Invalid Pay Amount");
        }
    }

    function checkTokenType(address tokenAddress) internal returns (TokenType) {
        StreamLibrary.TokenType tokenType = StreamStorage
            .getMapping()
            .partnerConfig[tokenAddress]
            .tokenType;
        if (tokenType == StreamLibrary.TokenType.NONE) {
            tokenType = checkTokenTypeViaContract(tokenAddress);
            StreamStorage
                .getMapping()
                .partnerConfig[tokenAddress]
                .tokenType = tokenType;
        }
        return tokenType;
    }
    /**
     * @notice Check if the token is an ERC1155 or ERC721 non-fungible token (NFT)
     * @param tokenAddress The address of the token
     * @return A boolean indicating whether the token is an ERC1155 NFT
     */
    function checkTokenTypeViaContract(
        address tokenAddress
    ) private view returns (TokenType) {
        if (IERC7066(tokenAddress).supportsInterface(type(IERC7066).interfaceId)) 
            return TokenType.ERC7066;
        if (IERC7066SFT(tokenAddress).supportsInterface(type(IERC7066SFT).interfaceId)) 
            return TokenType.ERC7066SFT;
        if (IERC721(tokenAddress).supportsInterface(type(IERC721).interfaceId))
            return TokenType.ERC721;
        if (IERC1155(tokenAddress).supportsInterface(type(IERC1155).interfaceId)) 
            return TokenType.ERC1155;
        else revert InvalidTokenType();
    }

    /**
     * @notice Check if the specified address is the owner of the token
     * @param tokenAddress The address of the token
     * @param tokenId The ID of the token
     * @param owner The address to check
     * @return A boolean indicating whether the specified address is the owner of the token
     */
    function checkOwner(
        address tokenAddress,
        uint tokenId,
        address owner,
        uint256 _balance
    ) internal returns (bool) {
        TokenType tokenType = checkTokenType(tokenAddress);
        if (tokenType == TokenType.ERC721 || tokenType == TokenType.ERC7066) {
            return (IERC721(tokenAddress).ownerOf(tokenId) == owner);
        } else if (tokenType == TokenType.ERC1155 || tokenType == TokenType.ERC7066SFT) {
            return (IERC1155(tokenAddress).balanceOf(owner, tokenId) >= _balance);
        }
        return false;
    }

    /**
     * @notice Transfer a token from one address to another
     * @param tokenAddress The address of the token
     * @param tokenId The ID of the token
     * @param from The address from which to transfer the token
     * @param to The address to which to transfer the token
     * @dev This internal function transfers a token from one address to another.
     */
    function transferToken(
        address from,
        address to,
        address tokenAddress,
        uint256 tokenId,
        bool wrap,
        bool doLock,
        uint256 amount
    ) internal {
        TokenType tokenType = checkTokenType(tokenAddress);
        bool is721 = false;
        if (tokenType == TokenType.ERC721 || tokenType == TokenType.ERC7066) {
            is721 = true;
        }
        if (wrap || tokenType == TokenType.ERC7066 || tokenType == TokenType.ERC7066SFT) {
            if (wrap) {
                tokenId = StreamStorage.getMapping().tokenMap[tokenAddress][tokenId];
                if (is721) tokenAddress = StreamStorage.getConfig().streamNFT;
                else tokenAddress = StreamStorage.getConfig().streamSFT;
            }
            if (doLock) {
                if (is721) {
                    IERC7066(tokenAddress).transferAndLock(
                        from,
                        to,
                        tokenId,
                        true
                    );
                } else {
                    IERC7066SFT(tokenAddress).transferAndLock(
                        from,
                        to,
                        tokenId,
                        amount,
                        true
                    );
                }
            } else {
                if (is721) {
                    IERC7066(tokenAddress).safeTransferFrom(from, to, tokenId);
                } else {
                    IERC7066SFT(tokenAddress).safeTransferFrom(
                        from,
                        to,
                        tokenId,
                        amount,
                        ""
                    );
                }
            }
        } else if (tokenType == TokenType.ERC1155) {
            IERC1155(tokenAddress).safeTransferFrom(
                from,
                to,
                tokenId,
                amount,
                ""
            );
        } else if (tokenType == TokenType.ERC721) {
            IERC721(tokenAddress).safeTransferFrom(from, to, tokenId);
        } else {
            revert InvalidTokenType();
        }
    }

    function applyDiscount(
        uint256 protocolFee,
        address user,
        State state,
        address tokenAddress,
        address _nftDiscount
    ) internal view returns (uint256) {
        uint256[4] memory discounts;

        // User-specific discount
        discounts[0] = StreamStorage.getMapping().discount[user][state];

        // Collection-specific discount
        discounts[1] = StreamStorage.getMapping().discount[tokenAddress][state];

        // NFT-based discount (only if user owns NFT)
        if (
            _nftDiscount != address(0) &&
            IERC721(_nftDiscount).balanceOf(user) > 0
        ) {
            discounts[2] = StreamStorage.getMapping().nftDiscount[_nftDiscount][
                state
            ];
        }

        // Global discount
        discounts[3] = (state == State.RENT)
            ? StreamStorage.getConfig().rentalDiscount
            : StreamStorage.getConfig().loanDiscount;

        // Find maximum discount
        uint256 maxDiscount = discounts[0];
        for (uint256 i = 1; i < discounts.length; i++) {
            if (discounts[i] > maxDiscount) {
                maxDiscount = discounts[i];
            }
        }

        // Apply maximum discount to the protocol fee
        return (protocolFee * (100 - maxDiscount)) / 100;
    }

    function getPartnerFee(
        address tokenAddress,
        uint256 amount,
        State state
    ) private view returns (uint256, address, address) {
        uint256 partnerFeeValue;
        address treasury;
        address paymentToken;
        //calculate partner fee
        Treasury memory treasuryDetail = StreamStorage
            .getMapping()
            .partnerConfig[tokenAddress]
            .treasury[state];
        if (treasuryDetail.wallet != address(0)) {
            treasury = treasuryDetail.wallet;
            paymentToken = treasuryDetail.token;
            partnerFeeValue =
                (((amount) * treasuryDetail.fee) / 100) /
                DECIMAL_MULTIPLIER;
        }
        return (partnerFeeValue, treasury, paymentToken);
    }

    function getLoanValues(
        AssetManager memory _assetManager,
        address tokenAddress,
        uint256 tokenId,
        uint256 index
    ) internal returns (uint256, address, uint256) {
        if (
            _assetManager.state == State.LOAN ||
            _assetManager.state == State.STALE_AND_LOAN ||
            _assetManager.state == State.RENT_AND_LOAN
        ) {
            if (!_assetManager.loanState.isNFTLoan) {
                StreamLibrary.LoanPool memory pool = StreamStorage
                    .getMapping()
                    .loanPoolList
                    .loanPools[_assetManager.loanState.loanPoolIndex];
                uint256 interest = ((pool.interestRateLender *
                    _assetManager.loanState.loanAmount) / 100) /
                    StreamLibrary.DECIMAL_MULTIPLIER;
                uint256 total = _assetManager.loanState.loanAmount + interest;
                address loanProvider = _assetManager.loanState.provider;
                --StreamStorage
                    .getMapping()
                    .loanOfferList[_assetManager.loanState.loanPoolIndex]
                    .loanOffers[_assetManager.loanState.loanOfferIndex]
                    .pendingLoans;
                uint256 protocolFee = ((interest * pool.interestRateProtocol) /
                    100);
                return (total, loanProvider, protocolFee);
            } else {
                StreamLibrary.NFTPool storage nftPool = StreamStorage
                    .getMapping()
                    .nftPools[tokenAddress][tokenId][index];
                uint256 interest = ((nftPool.interestRateLender *
                    _assetManager.loanState.loanAmount) / 100) /
                    StreamLibrary.DECIMAL_MULTIPLIER;
                uint256 total = _assetManager.loanState.loanAmount + interest;
                address loanProvider = _assetManager.loanState.provider;
                uint256 protocolFee = ((interest *
                    nftPool.interestRateProtocol) / 100);
                nftPool.initializerKey = address(0);
                return (total, loanProvider, protocolFee);
            }
        } else {
            revert InvalidAssetState();
        }
    }

    /** @notice Settle payment and fee
     * @param tokenAddress The address of the token
     * @param receiver of payment amount
     * @param amount of payment
     * @param discountedFee on amount
     * @dev This function handle payment transfers
     */
    function settlePayment(
        address tokenAddress,
        address sender,
        address receiver,
        State state,
        uint amount,
        uint discountedFee,
        uint256 withdrawFee
    ) internal // address _nftDiscount,
    // address user
    {
        StreamStorage.StreamConfig storage config = StreamStorage.getConfig();
        //get partner fee
        (
            uint256 partnerFeeValue,
            address treasury,
            address paymentToken
        ) = getPartnerFee(tokenAddress, amount, state);
        // console.log(partnerFeeValue, treasury, paymentToken);
        // payment
        if (paymentToken == address(0)) {
            // native payment
            // partner fee
            // console.log(amount + discountedFee + partnerFeeValue + withdrawFee);
            checkErrorInsufficientFunds(
                amount + discountedFee + partnerFeeValue + withdrawFee
            );
            if (partnerFeeValue != 0) {
                payable(treasury).transfer(partnerFeeValue);
            }
            // user payment
            payable(receiver).transfer(amount);
            // send fee to stream treasury
            payable(config.streamTreasury).transfer(discountedFee);
        } else {
            // erc20 payment
            if (partnerFeeValue != 0) {
                IERC20(paymentToken).safeTransferFrom(
                    sender,
                    treasury,
                    partnerFeeValue
                );
            }
            IERC20(paymentToken).safeTransferFrom(sender, receiver, amount);
            IERC20(paymentToken).safeTransferFrom(
                sender,
                config.streamTreasury,
                discountedFee
            );
        }
        // fee to revoke token
        if (withdrawFee != 0) {
            payable(config.streamTreasury).transfer(config.withdrawFee);
        }
    }
}
