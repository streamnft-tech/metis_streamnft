const { expect } = require('chai');
const { ethers } = require('hardhat');

const { getSelectors, FacetCutAction } = require('../scripts/scripts/libraries/diamond.js')

describe('Diamond', function () {
    async function deployDiamond() {
        const [deployer, Renter, Rentee, acc3] = await ethers.getSigners();

        const contractOwner = deployer

        // deploy stream7066
        const Stream7066 = await ethers.getContractFactory('StreamNFT')
        const stream7066 = await Stream7066.deploy(contractOwner.address)
        await stream7066.deployed()
        console.log('Stream7066 deployed:', stream7066.address)

        // deploy streamSFT
        const StreamSFT = await ethers.getContractFactory('StreamSFT')
        const streamSFT = await StreamSFT.deploy(contractOwner.address)
        await streamSFT.deployed()
        console.log('StreamSFT deployed:', streamSFT.address)


        // deploy DiamondCutFacet
        const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
        const diamondCutFacet = await DiamondCutFacet.deploy()
        await diamondCutFacet.deployed()
        console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

        // deploy Diamond
        const Diamond = await ethers.getContractFactory('Diamond')
        const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address)
        await diamond.deployed()
        console.log('Diamond deployed:', diamond.address)

        // deploy DiamondInit
        // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
        // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
        const DiamondInit = await ethers.getContractFactory('DiamondInit')
        const diamondInit = await DiamondInit.deploy()
        await diamondInit.deployed()
        console.log('DiamondInit deployed:', diamondInit.address)

        // deploy facets
        //console.log('')
        //console.log('Deploying facets')
        const FacetNames = [
            'DiamondLoupeFacet',
            'OwnershipFacet'
        ]
        const cut = []
        for (const FacetName of FacetNames) {
            const Facet = await ethers.getContractFactory(FacetName)
            const facet = await Facet.deploy()
            await facet.deployed()
            console.log(`${FacetName} deployed: ${facet.address}`)
            cut.push({
                facetAddress: facet.address,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(facet)
            })
        }

        // upgrade diamond with facets
        //console.log('')
        //console.log('Diamond Cut:', cut)
        const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)
        let tx
        let receipt
        // call to init function
        let functionCall = diamondInit.interface.encodeFunctionData('init')
        tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall)
        console.log('Diamond cut tx: ', tx.hash)
        receipt = await tx.wait()
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`)
        }
        console.log('Completed diamond cut')

        // Stream Facet Deployment
        const FacetStream = await ethers.getContractFactory('Stream');
        const facetStream = await FacetStream.deploy();
        await facetStream.deployed();
        console.log('Stream deployed:', facetStream.address);
        let selectors = getSelectors(facetStream).remove(['supportsInterface(bytes4)'])
        tx = await diamondCut.diamondCut(
            [{
                facetAddress: facetStream.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
        receipt = await tx.wait()
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`)
        } else {
            console.log("added Stream");
        }
        const streamDeployed = await ethers.getContractAt('Stream', diamond.address)
        await streamDeployed.setupConfig(10, stream7066.address, streamSFT.address, deployer.address, deployer.address, 0, 0, 1000);
        console.log("setup Stream config");
        await streamDeployed.setupStandardFeeConfig(100000000, 10000, 200000, 2500000, 20000, 10000);
        console.log("setup Stream config V2");
        // await streamDeployed.updateFee(10000,20000,30000,40000,50000);
        // console.log("updated fees");
        // await streamDeployed.updateDiscount(Rentee.address, 12, 50000);
        // console.log("updated discount for renter");

        // Rent Facet Deployment
        const FacetRent = await ethers.getContractFactory('RentUtil');
        const facetRent = await FacetRent.deploy();
        await facetRent.deployed();
        console.log('Rent deployed:', facetRent.address);
        selectors = getSelectors(facetRent)
        tx = await diamondCut.diamondCut(
            [{
                facetAddress: facetRent.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
        receipt = await tx.wait()
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`)
        } else {
            console.log("added Rent");
        }

        // Loan Facet Deployment
        const FacetLoan = await ethers.getContractFactory('LoanUtil');
        const facetLoan = await FacetLoan.deploy();
        await facetLoan.deployed();
        console.log('Loan deployed:', facetLoan.address);
        selectors = getSelectors(facetLoan)
        tx = await diamondCut.diamondCut(
            [{
                facetAddress: facetLoan.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
        receipt = await tx.wait()
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`)
        } else {
            console.log("added Loan");
        }

        const Lib = await ethers.getContractFactory("ERC6551RegistryLib");
        const lib = await Lib.deploy();
        await lib.deployed();

        //Access Facet Deployment
        const FacetAccess = await ethers.getContractFactory('AccessUtils');
        const facetAccess = await FacetAccess.deploy();
        await facetAccess.deployed();
        console.log('Loan deployed:', facetAccess.address);
        selectors = getSelectors(facetAccess)
        tx = await diamondCut.diamondCut(
            [{
                facetAddress: facetAccess.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
        receipt = await tx.wait()
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`)
        } else {
            console.log("added Access");
        }

        // Getter Facet Deployment
        const FacetGetter = await ethers.getContractFactory('Getter');
        const facetGetter = await FacetGetter.deploy();
        await facetGetter.deployed();
        console.log('Getter deployed:', facetGetter.address);
        selectors = getSelectors(facetGetter)
        tx = await diamondCut.diamondCut(
            [{
                facetAddress: facetGetter.address,
                action: FacetCutAction.Add,
                functionSelectors: selectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
        receipt = await tx.wait()
        if (!receipt.status) {
            throw Error(`Diamond upgrade failed: ${tx.hash}`)
        } else {
            console.log("added getter");
        }

        // TokenLaunch Facet Deployment
        // const TokenLaunch = await ethers.getContractFactory('TokenLaunch');
        // const tokenLaunch = await TokenLaunch.deploy();
        // await tokenLaunch.deployed();
        // console.log('Getter deployed:', tokenLaunch.address);
        // selectors = getSelectors(tokenLaunch)
        // tx = await diamondCut.diamondCut(
        //     [{
        //         facetAddress: tokenLaunch.address,
        //         action: FacetCutAction.Add,
        //         functionSelectors: selectors
        //     }],
        //     ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
        // receipt = await tx.wait()
        // if (!receipt.status) {
        //     throw Error(`Diamond upgrade failed: ${tx.hash}`)
        // } else {
        //     console.log("added tokenLaunch");
        // }

        await stream7066.connect(contractOwner).updateOwner(diamond.address);
        console.log("diamond added as owner to streamNFT");
        await streamSFT.connect(contractOwner).updateOwner(diamond.address);
        console.log("diamond added as owner to streamSFT");

        // deploy support contract
        const ERC721NFT = await ethers.getContractFactory('CommonNFT');
        let erc721NFT = await ERC721NFT.deploy();
        await erc721NFT.deployed();
        await erc721NFT.connect(Renter).mint(Renter.address,0);
        console.log("721 minted : 0")

        // deploy ERC 7066 NFT and mint an NFT
        const ERC7066NFT = await ethers.getContractFactory('ERC7066NFT');
        let erc7066NFT = await ERC7066NFT.deploy();
        await erc7066NFT.deployed();
        await erc7066NFT.connect(Renter).mint(Renter.address);
        console.log("7066NFT minted")

        // deploy ERC1155 NFT and mint an NFT
        const ERC1155NFT = await ethers.getContractFactory('ERC1155Nft');
        let erc1155NFT = await ERC1155NFT.deploy();
        await erc1155NFT.deployed();
        await erc1155NFT.connect(Renter).mint(Renter.address, 3);
        console.log("1155 minted")

        return {
            diamond,
            deployer,
            Renter,
            Rentee,
            acc3,
            erc721NFT,
            erc7066NFT,
            erc1155NFT,
            stream7066,
            streamSFT
        };
    }

    async function setupAccess() {
        const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT, erc1155NFT, stream7066, streamSFT } = await deployDiamond();
        const test1Facet = await ethers.getContractAt('AccessUtils', diamond.address);
        const test2Facet = await ethers.getContractAt('Getter', diamond.address)

        const IP_NFT = await ethers.getContractFactory('IP_NFT');
        const ip_nft = await IP_NFT.deploy("IP-NFT", "IP-NFT", diamond.address);
        await ip_nft.deployed();
        console.log('IP_NFT deployed:', ip_nft.address);
        // await ip_nft.connect(Renter).mint(Renter.address);
        // console.log("IP_NFT minted");

        const AccessToken = await ethers.getContractFactory('AccessToken');
        const accessToken = await AccessToken.deploy();
        await accessToken.deployed();
        console.log('accessToken deployed:', accessToken.address);

        const CourseCollection = await ethers.getContractFactory('CourseCollection');
        const courseCollection = await CourseCollection.deploy();
        await courseCollection.deployed();
        console.log('courseCollection deployed:', courseCollection.address);

        const Ed3Certificate = await ethers.getContractFactory('Ed3Certificate');
        const ed3Certificate = await Ed3Certificate.deploy();
        await ed3Certificate.deployed();
        console.log('ed3Certificate deployed:', ed3Certificate.address);

        const ERC6551Account = await ethers.getContractFactory('ERC6551Account');
        const erc6551Account = await ERC6551Account.deploy();
        await erc6551Account.deployed();
        console.log('erc6551Account deployed:', erc6551Account.address);

        const registry = await ethers.getContractFactory('ERC6551Registry');
        const registryInstance = await registry.deploy();
        await registryInstance.deployed();
        console.log('Registry deployed:', registryInstance.address);

        await test1Facet.connect(deployer).setImplementation(accessToken.address, ip_nft.address, courseCollection.address, erc6551Account.address, ed3Certificate.address, registryInstance.address);
        console.log("Implementation set");

        return {
            diamond,
            deployer,
            Renter,
            Rentee,
            test1Facet,
            test2Facet
        }
    }

    it('content creation with fee', async function () {
        const { diamond, deployer, Renter, Rentee, test1Facet, test2Facet } = await setupAccess();

        let isCustom = await test2Facet.connect(Rentee).getCustomFee(Renter.address, 0);
        console.log("Is custom : ",isCustom);
        let fee = isCustom[1];    
        if(!isCustom[0]) {
            fee = await test2Facet.connect(Rentee).getStandardFee(0);
        }
        console.log("Fee : ",fee);

        let data = {
            individualPrices: [100, 200, 300],
            modulePrice: 500,
            nameAndSymbol: ["Course", "Certificate", "C", "C", "A", "A"],
            tokenURIs: ["URI1", "URI2", "URI3"],
            mintNFT: [true, true],
            maxSupply: [100, 100],
            tokenURIsForNFT: ["CERTI_URI", "ACCESS_URI"],
            expiry: 0,
            courseSalt: ethers.utils.formatBytes32String("course")
        }

        await test1Facet.connect(Renter).createContentAndIP(data, {value : fee});
        console.log("Content created");
    })

    it.only('access content with fee ', async function () {
        const { diamond, deployer, Renter, Rentee, test1Facet, test2Facet } = await setupAccess();

        let data = {
            individualPrices: [100, 200, 300],
            modulePrice: 50000,
            nameAndSymbol: ["Course", "Certificate", "C", "C", "A", "A"],
            tokenURIs: ["URI1", "URI2", "URI3"],
            mintNFT: [true, true],
            maxSupply: [100, 100],
            tokenURIsForNFT: ["CERTI_URI", "ACCESS_URI"],
            expiry: 0,
            courseSalt: ethers.utils.formatBytes32String("course")
        }
        let creationFee = await test2Facet.connect(Rentee).getStandardFee(0);
        console.log("Creation Fee : ",creationFee);

        await test1Facet.connect(Renter).createContentAndIP(data, {value : creationFee});
        console.log("Content created");

        let isCustom = await test2Facet.connect(Rentee).getCustomFee(Renter.address, 1);
        console.log("Is custom : ",isCustom);
        let percentFee = isCustom[1];    
        if(!isCustom[0]) {
            percentFee = await test2Facet.connect(Rentee).getStandardFee(1);
        }
        console.log("percentFee : ",percentFee);

        let feeValue =(data.modulePrice * percentFee / 100000);
        console.log("percentFee Value : ",feeValue);

        let isCustomFlat = await test2Facet.connect(Rentee).getCustomFee(Renter.address, 2);
        let flatfee = isCustomFlat[1];
        if(!isCustomFlat[0]) {
            flatfee = await test2Facet.connect(Rentee).getStandardFee(2);
        }
        console.log("Flat Fee : ",flatfee);

        let finalValue =  data.modulePrice + feeValue + flatfee.toNumber();
        console.log("total Value : ",finalValue);

        await test1Facet.connect(Rentee).accessContent(0, {value : finalValue});
        console.log("Content accessed");
    })

    it('access Module with fee ',async function() {
        const { diamond, deployer, Renter, Rentee, test1Facet, test2Facet } = await setupAccess();

        let data = {
            individualPrices: [1000, 2000, 3000],
            modulePrice: 50000,
            nameAndSymbol: ["Course", "Certificate", "C", "C", "A", "A"],
            tokenURIs: ["URI1", "URI2", "URI3"],
            mintNFT: [true, true],
            maxSupply: [100, 100],
            tokenURIsForNFT: ["CERTI_URI", "ACCESS_URI"],
            expiry: 0,
            courseSalt: ethers.utils.formatBytes32String("course")
        }

        await test1Facet.connect(Renter).createContentAndIP(data, {value : 40000});
        console.log("Content created");

        let feeValue =(data.individualPrices[1] * fees[2] / 100000);
        console.log("Fee Value : ",feeValue);
        let discount = await test2Facet.connect(Rentee).getDiscount(Rentee.address, 12);
        console.log("Discount : ",discount);
        feeValue = feeValue * discount / 100000;
        feeValue = feeValue +  data.individualPrices[1];
        console.log("Discounted Fee Value : ",feeValue);

        await test1Facet.connect(Rentee).accessModule(0, 1, {value : feeValue});
        console.log("Module accessed");
    })
})