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

    it('should test the access', async function () {
        const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT, erc1155NFT, stream7066, streamSFT } = await deployDiamond();
        const test1Facet = await ethers.getContractAt('AccessUtils', diamond.address);
        const test2Facet = await ethers.getContractAt('Getter', diamond.address)
        // erc721NFT.connect(Renter).approve(diamond.address, 0);
        await erc721NFT.connect(Renter).mint(Renter.address,1);
        console.log("721 minted : 1")
        // await test1Facet.connect(Renter).registerIndividual(erc721NFT.address,1);
        // console.log("Registered 721 : 1")

        await erc721NFT.connect(Renter).mint(Renter.address,2);
        console.log("721 minted : 2")
        // await test1Facet.connect(Renter).registerIndividual(erc721NFT.address,2);
        // console.log("Registered 721 : 2")

        await erc721NFT.connect(Renter).mint(Renter.address,3);
        console.log("721 minted : 3")
        // await test1Facet.connect(Renter).registerIndividual(erc721NFT.address,3);
        // console.log("Registered 721 : 3")

        await erc721NFT.connect(Renter).mint(Renter.address,4);
        console.log("721 minted : 4")

        // Deploy IP_NFT, AccessToken, CourseCollection and TBA
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

        // const myBytes32Value = 0x0000000000000000000000000000000000000000000000000000000000000001;
        const hexNumber = ethers.utils.hexlify(73);
        const bytes32Number = ethers.utils.hexZeroPad(hexNumber, 32);

        // await registryInstance.connect(Renter).createAccount(erc6551Account.address, bytes32Number, 31337,ip_nft.address,1 )
        // console.log("Account created");
        // const tbaWithRegistry = await registryInstance.connect(Renter).getAccount(erc6551Account.address, bytes32Number, 31337,ip_nft.address,1 )
        // console.log("TBA with registry : ",tbaWithRegistry);

        let addresses = [erc721NFT.address,erc721NFT.address];
        let ids = [0,1];
        let prices = [100,200,300,400]
        let uris = ["URI1","URI2","URI3","URI4"];
        let names = ["CourseName", "CertificateName","C1","C2"]
        // let symbols = ["C1", "C2"]

        // // create a TBA
        // await test1Facet.connect(Renter).createTBAaccountAndCourseCollection(prices, 10000, 0);
        // console.log("TBA created");
        // const tba = await test2Facet.connect(Renter).getTBAaccount(ip_nft.address,2);
        // console.log("TBA address : ",tba);
        // const list = await test2Facet.connect(Renter).getAccessRegisterList();
        // console.log("Course Collection : ",list[0].tokenAddresses[0]);

        // await test1Facet.connect(Renter).Register(0, tba , list[0].tokenAddresses[0], uris, true, 99);
        // console.log('Registeration done');

        


        await test1Facet.connect(Renter).createContentAndIP(
            // registryInstance.address,
            prices,
            10000,
            names,
            // symbols,
            uris,
            [true, true],
            [100, 100],
            "CertificateURI",
            0,
            bytes32Number
        );
        console.log("created and registered");
        // await test1Facet.connect(Renter).Register(courseCollection.address,prices, 10000, uris, true, 99, 0);
        // console.log("registered");

        // await test1Facet.connect(Rentee).accessContent(0);
        // console.log("accessed");

        // const expiry = await test1Facet.connect(Renter).getContentExpiry(0,Rentee.address);
        // console.log("expiry : ",expiry);

    });

})