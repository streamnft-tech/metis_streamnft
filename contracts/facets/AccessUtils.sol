pragma solidity ^0.8.4;

import "../libraries/StreamStorage.sol";
import "../libraries/StreamLibrary.sol";
import "../libraries/ERC6551AccountLib.sol";
import "../interfaces/IERC6551Account.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../interfaces/IERC6551Registry.sol";
import "../interfaces/IAccessToken.sol";
import "../interfaces/IIP-NFT.sol";
import "../interfaces/ICourseCollection.sol";
import "../interfaces/ICertificate.sol";

contract AccessUtils {
    uint256 constant PERCENTAGE_DIVISOR= 100000; // 100 * DECIMAL_MULTIPLIER

    // send msg.value to ip nft owner
    function accessContent(uint256 _index) external payable {
        StreamStorage.StreamMapping storage s = StreamStorage.getMapping();
        StreamLibrary.AccessRegister memory accessRegister = s.accessRegisterList.accessRegister[_index];
        StreamStorage.FeeConfig storage feeConfig = StreamStorage.getFeeConfig();
        uint256 contentPrice = accessRegister.contentPrice;
        // Get owner of the NFT (TBA logic)
        address owner = IERC6551Account(payable(IERC721(accessRegister.tokenAddresses[0]).ownerOf(1))).owner(); //todo: remove hard logic

        uint256 flatfee;
        if(feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFlatFee].isCustomFee) {
            flatfee = feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFlatFee].fee;
        } else {
            flatfee = feeConfig.standardFee[StreamLibrary.FeeType.ContentAccessFlatFee];
        }

        uint256 percentFee;
        if(feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFee].isCustomFee) {
            percentFee = feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFee].fee;
        } else {
            percentFee = feeConfig.standardFee[StreamLibrary.FeeType.ContentAccessFee];
        }
        uint256 totalFee = ((contentPrice * percentFee) / PERCENTAGE_DIVISOR) + flatfee;

        // Require exact payment
        if (msg.value != contentPrice + totalFee) {
            revert StreamLibrary.InsufficientFunds(msg.value, contentPrice + totalFee);
        }

        uint256 tokenId;
        bool mintAccessNFT = accessRegister.mintAccessNFT;
        uint256 expiry = accessRegister.expiry;
        
        // Mint access NFT if required
        if (mintAccessNFT) {
            tokenId = IAccessToken(accessRegister.accessCollection).mint(msg.sender);
        }

        // Compute expiry time
        uint256 expiryTime = (expiry == 0) ? type(uint256).max : block.timestamp + expiry;

        // Store expiry time efficiently
        if (mintAccessNFT) {
            s.accessTokenExpiry[_index][tokenId].contentExpiry = expiryTime;
        } else {
            s.expiry[_index][msg.sender].contentExpiry = expiryTime;
        }
        // Emit event after state changes
        emit StreamLibrary.AccessModule(_index, msg.sender, expiryTime);

        // Transfer payment (use `call` to prevent reverts)
        if(totalFee>0){
            payable(StreamStorage.getConfig().streamTreasury).transfer(totalFee);
        }
        if(contentPrice>0){
            payable(owner).transfer(contentPrice);
        }
    }

    // send msg.value to ip nft owner
    // content still held by TBA
    function accessModule(uint256 _index, uint256 _individualIndex) external payable {
        StreamStorage.StreamMapping storage s = StreamStorage.getMapping();
        StreamLibrary.AccessRegister memory accessRegister = s.accessRegisterList.accessRegister[_index];
        address tbaAccount = IERC721(accessRegister.tokenAddresses[0]).ownerOf(_individualIndex+1);
        address owner = IERC6551Account(payable(tbaAccount)).owner();
        StreamStorage.FeeConfig storage feeConfig = StreamStorage.getFeeConfig();
        uint256 modulePrice = accessRegister.modulePrice[_individualIndex];
        uint256 flatfee;
        if(feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFlatFee].isCustomFee) {
            flatfee = feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFlatFee].fee;
        } else {
            flatfee = feeConfig.standardFee[StreamLibrary.FeeType.ContentAccessFlatFee];
        }

        uint256 percentFee;
        if(feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFee].isCustomFee) {
            percentFee = feeConfig.customFee[owner][StreamLibrary.FeeType.ContentAccessFee].fee;
        } else {
            percentFee = feeConfig.standardFee[StreamLibrary.FeeType.ContentAccessFee];
        }
        uint256 totalFee = ((modulePrice * percentFee) / PERCENTAGE_DIVISOR) + flatfee;

        // Require exact payment
        if (msg.value != modulePrice + totalFee) {
            revert StreamLibrary.InsufficientFunds(msg.value, modulePrice + totalFee);
        }


        if(accessRegister.expiry==0) {
            s.expiry[_index][msg.sender].moduleExpiry[_individualIndex] = type(uint256).max;
            emit StreamLibrary.AccessIndividual(_index, _individualIndex, msg.sender, type(uint256).max);
        } else{
            s.expiry[_index][msg.sender].moduleExpiry[_individualIndex] = block.timestamp + accessRegister.expiry;
            emit StreamLibrary.AccessIndividual(_index, _individualIndex, msg.sender, accessRegister.expiry);
        }
        // Payment transfer
        if(totalFee>0){
            payable(StreamStorage.getConfig().streamTreasury).transfer(totalFee);
        }
        if(modulePrice>0){
            payable(owner).transfer(modulePrice);
        }
    }

    // function registerIndividual(address tokenAddress, uint tokenId) public payable {
    //     if(msg.sender != IERC721(tokenAddress).ownerOf(tokenId)) {
    //                 revert StreamLibrary.NotOwner();
    //             }
    //     address collection = Clones.cloneDeterministic(s.implementation.access, keccak256(abi.encodePacked(tokenAddress, tokenId)));
    //     StreamStorage.getMapping().individualAccessCollection[tokenAddress][tokenId] = collection;
    //     IAccessToken(collection).init(address(0));
    //     emit StreamLibrary.RegisterIndividual(tokenAddress, tokenId, collection);
    // }

    struct ContentData {
        uint256[] individualPrices;
        uint256 modulePrice;
        string[6] nameAndSymbol; // 0= courseName, 1 = certificateName,  2= courseSymbol, 3 = certificateSymbol, 4= accessName, 5= accessSymbol
        string[] tokenURIs;
        bool[2] mintNFT; // 0 = mintAccessNFT, 1 = mintCertficateNFT
        uint256[2] maxSupply; //0 = maxAccessSupply, 1 = maxCertificateSupply
        string[2] tokenURIsForNFT; // 0 = certificateURI, 1 = accessURI
        uint256 expiry;
        bytes32 courseSalt;
    }

    function createContentAndIP(
        // IERC6551Registry _registry,
        ContentData calldata content
    ) external payable {
        if(content.individualPrices.length != content.tokenURIs.length) {
            revert StreamLibrary.InvalidLength();
        }
        StreamStorage.StreamMapping storage s = StreamStorage.getMapping();

        StreamLibrary.Implementation memory implement = s.implementation;

        // Mint IP-NFT 
        uint ipId = IIP_NFT(implement.ipNft).mint(msg.sender);

        // Create 6551 account
        address tbaAccount = IERC6551Registry(implement.registry6551).createAccount(implement.tba , 0 , block.chainid , implement.ipNft, ipId);

        uint length = s.accessRegisterList.accessRegister.length;

        // deploy ERC721 contract and batch mint the modules in 6551 account
        address course = Clones.cloneDeterministic(
                                        implement.courseCollection, 
                                        content.courseSalt
                                    );

        ICourseCollection(course).mintAndName(content.nameAndSymbol[0], content.nameAndSymbol[2], tbaAccount, content.tokenURIs);

        // Register module and deploy accessToken
        StreamLibrary.AccessRegister memory accessRegister;
        accessRegister.tokenAddresses = new address[](1);
        accessRegister.tokenAddresses[0] = course;
        accessRegister.tokenIds = new uint[](1);
        accessRegister.tokenIds[0] = content.tokenURIs.length;
        accessRegister.modulePrice = content.individualPrices;
        accessRegister.contentPrice = content.modulePrice;
        accessRegister.expiry = content.expiry;
        accessRegister.mintCertificate = content.mintNFT[1];
        accessRegister.mintAccessNFT = content.mintNFT[0];

        if(content.mintNFT[0]){
            accessRegister.accessCollection = Clones.cloneDeterministic(
                                implement.access, 
                                keccak256(abi.encodePacked("Access",  length))
                            );
            IAccessToken(accessRegister.accessCollection).init(tbaAccount,content.maxSupply[0],content.nameAndSymbol[4], content.nameAndSymbol[5], content.tokenURIsForNFT[1]); 
        }
        if(content.mintNFT[1]){
            accessRegister.certificateCollection = Clones.cloneDeterministic(
                                implement.certificate, 
                                keccak256(abi.encodePacked("Certificate",  length))
                            );
            IEd3Certificate(accessRegister.certificateCollection).init(content.nameAndSymbol[1], content.nameAndSymbol[3], content.maxSupply[1], content.tokenURIsForNFT[0], length, accessRegister.accessCollection); 
        }
        accessRegister.isSameCollection = true;
        s.accessRegisterList.accessRegister.push(accessRegister);

        // pay creation fee
        uint fee;
        if(StreamStorage.getFeeConfig().customFee[msg.sender][StreamLibrary.FeeType.ContentCreationFee].isCustomFee) {
            fee = StreamStorage.getFeeConfig().customFee[msg.sender][StreamLibrary.FeeType.ContentCreationFee].fee;
        } else {
            fee = StreamStorage.getFeeConfig().standardFee[StreamLibrary.FeeType.ContentCreationFee];
        }
        emit StreamLibrary.CreateContentAndIP(length, ipId, tbaAccount, course, accessRegister.accessCollection, accessRegister.certificateCollection);
        
        if(msg.value != fee) {
            revert StreamLibrary.InsufficientFunds(msg.value, fee);
        } else {
            payable(StreamStorage.getConfig().streamTreasury).transfer(msg.value);
        }

    }

    function setImplementation(address _access, address _ipNft, address _courseCollection, address _tba, address _certificate, address _registry) external {
        if(msg.sender!=StreamStorage.getConfig().admin) revert StreamLibrary.RequiredAdmin();
        StreamLibrary.Implementation storage s = StreamStorage.getMapping().implementation;
        s.access = _access;
        s.ipNft = _ipNft;
        s.courseCollection = _courseCollection;
        s.tba = _tba;
        s.certificate = _certificate;
        s.registry6551 = _registry;
    }

}