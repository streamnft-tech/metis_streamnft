// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../libraries/StreamStorage.sol";
import "../interfaces/ITokenInit.sol";
import "../libraries/StreamLibrary.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract TokenLaunch {

    event TokenLaunched(address tokenAddress);

    function launchToken(
        StreamLibrary.LaunchpadTokenType tokenType,
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        uint256 price,
        string calldata _tokenURI,
        StreamLibrary.LaunchpadInput calldata launchPadInput
    ) public payable {
        // Retrieve implementation addresses
        address implementationAddress = getLaunchpadImplementation(tokenType);

        // Clone the contract deterministically
        address clonedContract = Clones.cloneDeterministic(
            implementationAddress,
            keccak256(abi.encode(block.timestamp, msg.sender)) // Unique salt
        );

        // Check if the sender has a custom fee set
        StreamStorage.FeeConfig storage feeConfig = StreamStorage.getFeeConfig();
        address treasury =  StreamStorage.getConfig().streamTreasury;
        uint256 flatfee;
        if(feeConfig.customFee[msg.sender][StreamLibrary.FeeType.LaunchPadFee].isCustomFee) {
            flatfee = feeConfig.customFee[msg.sender][StreamLibrary.FeeType.LaunchPadFee].fee;
        } else {
            flatfee = feeConfig.standardFee[StreamLibrary.FeeType.LaunchPadFee];
        }
        // Transfer the fee to the admin
        if(flatfee>0){
            if(msg.value!=flatfee){
                revert StreamLibrary.InsufficientFunds(msg.value, flatfee);
            }
            payable(treasury).transfer(flatfee);
        }
        StreamLibrary.MintFee memory mintFee = feeConfig.mintFee[tokenType];
        if(!mintFee.initialized){
            mintFee = getFee(feeConfig);
        }
        // Initialize the cloned contract
        initializeClonedContract(clonedContract, tokenType, _name, _symbol, _maxSupply, price, _tokenURI, mintFee, treasury, launchPadInput);
        emit TokenLaunched(clonedContract);
    }

    function getFee(StreamStorage.FeeConfig storage feeConfig) private view returns(StreamLibrary.MintFee memory) {
        // uint256 mintFlatfee;
        // if(feeConfig.customFee[msg.sender][StreamLibrary.FeeType.MintFee].isCustomFee) {
        //     mintFlatfee = feeConfig.customFee[msg.sender][StreamLibrary.FeeType.MintFee].fee;
        // } else {
        //     mintFlatfee = feeConfig.standardFee[StreamLibrary.FeeType.MintFee];
        // }

        uint256 mintPercentfee;
        if(feeConfig.customFee[msg.sender][StreamLibrary.FeeType.MintFee].isCustomFee) {
            mintPercentfee = feeConfig.customFee[msg.sender][StreamLibrary.FeeType.MintFee].fee;
        } else {
            mintPercentfee = feeConfig.standardFee[StreamLibrary.FeeType.MintFee];
        }
        return StreamLibrary.MintFee(true, 0, mintPercentfee);
    }

    function getLaunchpadImplementation(StreamLibrary.LaunchpadTokenType tokenType) internal view returns (address) {
        StreamLibrary.LaunchpadImplementation memory implement = StreamStorage.getMapping().launchpadImplementation;

        if (tokenType == StreamLibrary.LaunchpadTokenType.SoulBoundPrivate) {
            return implement.soulBoundPrivate;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC1155Public) {
            return implement.erc1155Public;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC1155Private) {
            return implement.erc1155Private;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC721Public) {
            return implement.erc721Public;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC721Private) {
            return implement.erc721Private;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.Certificate) {
            return implement.certificate;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.Passes) {
            return implement.passes;
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC721Advanced) {
            return implement.erc721Advanced;
        } else if(tokenType == StreamLibrary.LaunchpadTokenType.ERC1155Advanced){
            return implement.erc1155Advanced;
        }else {
            revert("Invalid TokenType");
        }
    }

    /**
     * @dev Set all implementation addresses at once.
     * @param implementations An array of addresses corresponding to token types.
     * Order: erc1155Private, erc1155Public, erc721Public, erc721Private, erc7066Private, erc7066Public, soulBoundPrivate, soulBoundPublic, certificate, passes
     */
    function setAllLaunchpadImplementations(address[12] memory implementations) public {
        if(msg.sender!=StreamStorage.getConfig().admin) revert StreamLibrary.RequiredAdmin();

        StreamLibrary.LaunchpadImplementation storage implement = StreamStorage.getMapping().launchpadImplementation;

        implement.erc1155Private = implementations[0];
        implement.erc1155Public = implementations[1];
        implement.erc721Public = implementations[2];
        implement.erc721Private = implementations[3];
        implement.erc7066Private = implementations[4];
        implement.erc7066Public = implementations[5];
        implement.soulBoundPrivate = implementations[6];
        implement.soulBoundPublic = implementations[7];
        implement.certificate = implementations[8];
        implement.passes = implementations[9];
        implement.erc721Advanced = implementations[10];
        implement.erc1155Advanced = implementations[11];
    }

    function setMintFee(StreamLibrary.LaunchpadTokenType _type, StreamLibrary.MintFee calldata fee) public{
        if(msg.sender!=StreamStorage.getConfig().admin) revert StreamLibrary.RequiredAdmin();
        StreamStorage.FeeConfig storage feeConfig = StreamStorage.getFeeConfig();
        feeConfig.mintFee[_type] = fee;
    }

    function initializeClonedContract(
        address clonedContract,
        StreamLibrary.LaunchpadTokenType tokenType,
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        uint256 price,
        string calldata _tokenURI,
        StreamLibrary.MintFee memory mintFee,
        address danTreasury,
        StreamLibrary.LaunchpadInput calldata launchPadInput
    ) internal {
        if (tokenType == StreamLibrary.LaunchpadTokenType.Certificate) {   
            ITokenInit(clonedContract).init(_name, _symbol, _maxSupply, msg.sender, _tokenURI);
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC721Private || tokenType == StreamLibrary.LaunchpadTokenType.SoulBoundPrivate) {
            ITokenInit(clonedContract).init(_name, _symbol, _maxSupply, msg.sender);
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC721Public) {
            uint256 totalFee= mintFee.flatFee + (mintFee.percentageFee*price)/100;
            ITokenInit(clonedContract).init(_name, _symbol, price, _maxSupply, msg.sender, totalFee, danTreasury);
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC1155Public || tokenType == StreamLibrary.LaunchpadTokenType.ERC1155Private) {
            ITokenInit(clonedContract).init(_name, _symbol, msg.sender, mintFee.percentageFee, mintFee.flatFee, danTreasury);
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.Passes) {
            uint256 totalFee= mintFee.flatFee + (mintFee.percentageFee*price)/100;
            ITokenInit(clonedContract).init(_name, _symbol, price, _maxSupply, msg.sender, _tokenURI, totalFee, danTreasury);
        } else if (tokenType == StreamLibrary.LaunchpadTokenType.ERC721Advanced) {
            //TODO: correct cal per drop phase uint256 totalFee= mintFee.flatFee + (mintFee.percentageFee*price)/100;
            ITokenInit(clonedContract).init(_name, _symbol, _maxSupply, msg.sender, _tokenURI, danTreasury, launchPadInput);
        } else if(tokenType == StreamLibrary.LaunchpadTokenType.ERC1155Advanced){
            //TODO: correct cal per drop phase uint256 totalFee= mintFee.flatFee + (mintFee.percentageFee*price)/100;
            ITokenInit(clonedContract).init(_name, _symbol, msg.sender, danTreasury, launchPadInput._royaltyBps, mintFee.flatFee, mintFee.percentageFee, launchPadInput.royaltyAddress);
        } else {
            revert("Invalid TokenType");
        }
    }
}