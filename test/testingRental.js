const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const { getSelectors, FacetCutAction } = require('../scripts/scripts/libraries/diamond.js')
const {
    time,
    impersonateAccount,
} = require('@nomicfoundation/hardhat-network-helpers');
const { c } = require('tar');

describe('diamond', () => {
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
        console.log("721 minted")

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

    async function deployLendToken(validity) {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066 } =
            await deployDiamond();
        validity = validity || 35;
        // approve contract
        await erc721NFT.connect(Renter).approve(diamond.address, 0);
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
        let txn;
        // address, tokenId,ratePerMinute,validityMinutes,isFixed,
        console.log("testfaucet1: ", test1Facet)
        
        const rentState1 = {
            rate: 48611111111,
            validityExpiry: 300,
            isFixed: false,
            doMint: false,
            fixedMinutes: 30,
            ownerShare: 0,
            rentExpiry: 0,
            rentee: ethers.constants.AddressZero,
            merkleRoot: ethers.constants.HashZero
        }

        try {
            //domint was true
            txn = await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                rentState1, // rentState
                300, // validityMinutes
                1, //noOfAssets
                false, //existingIndex
                0 // index
            );
            // //console.log("txn " + txn)
            console.log("Init rent done");
        } catch (e) {
            console.log("txn " + txn)
            console.log(e);
        }
        expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
        return { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT, erc1155NFT, stream7066 };
    }

    it('Tetsing ERC1155', async () => {
        const { diamond,
            deployer,
            Renter,
            Rentee,
            acc3,
            erc721NFT,
            erc7066NFT,
            erc1155NFT } =
            await deployDiamond();

        const rentState1 = {
            rate: 48611111111,
            validityExpiry: 300,
            isFixed: false,
            doMint: false,
            fixedMinutes: 30,
            ownerShare: 0,
            rentExpiry: 0,
            rentee: ethers.constants.AddressZero,
            merkleRoot: ethers.constants.HashZero
        }

        await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        
        console.log("erc: ", erc1155NFT.address)
        await test1Facet.connect(Renter).lendToken(
            erc1155NFT.address,
            0, // tokenId
            rentState1, // rentState
            300, // validityMinutes
            1, //noOfAssets
            false, //existingIndex
            0 //index
        );

        // check if the owner of the token is the contract now
        expect(await erc1155NFT.balanceOf(diamond.address, 0)).to.equal(1);
        // // STATE CHECKS
        const Storage = await ethers.getContractAt('Getter', diamond.address)
        const assetManager = await Storage.connect(Rentee).getFungibleAssetMaster(erc1155NFT.address, 0,0);
        console.log(assetManager)
        expect(assetManager.rentState.rentee).to.eq(Renter.address);
        const rentState = ethers.BigNumber.from('4'); // STALE
        expect(assetManager.state).to.eq(rentState);

        await test1Facet
            .connect(Rentee)
            .processRent(
                erc1155NFT.address, 
                0, 
                30, 
                ethers.constants.AddressZero,
                [], 
                0,
                0, true );
    })

    it('Testing ERC721', async () => {
        const { diamond,
            deployer,
            Renter,
            Rentee,
            acc3,
            erc721NFT,
            erc7066NFT,
            erc1155NFT } =
            await deployLendToken();
        // rent for 10 mins
        // approve contract
        erc721NFT.connect(Renter).approve(diamond.address, 0);

        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        await test1Facet
            .connect(Rentee)
            .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

        expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

        // // STATE CHECKS
        const Storage = await ethers.getContractAt('Getter', diamond.address)
        const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
        const rentState = ethers.BigNumber.from('1'); // RENT
        expect(assetManager.state).to.eq(rentState);
        expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
    });

    it('testing stream7066', async () => {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066 } =
            await deployDiamond();
        
        const Stream7066 = await ethers.getContractFactory('StreamNFT')
        const streamNFT = await Stream7066.deploy(Renter.address)
        await streamNFT.deployed()
        console.log('StreamNFT deployed:', streamNFT.address)
        await streamNFT.connect(Renter).updateOwner(Renter.address)

        await streamNFT.connect(Renter).mint(Renter.address, 1);
        console.log("minted")
        await streamNFT.connect(Renter).setApprovalForAll(diamond.address, true);
        console.log("approved");
        

        const rentState1 = {
            rate: 48611111111,
            validityExpiry: 300,
            isFixed: false,
            doMint: false,
            fixedMinutes: 30,
            ownerShare: 0,
            rentExpiry: 0,
            rentee: ethers.constants.AddressZero,
            merkleRoot: ethers.constants.HashZero
        }
        
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        await test1Facet.connect(Renter).lendToken(
            streamNFT.address,
            1, // tokenId
            rentState1, // rentState
            300, // validityMinutes
            1, //noOfAssets
            false, //existingIndex
            0 //index
        );
        console.log("LEND TOKEN DONE")

        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));
        await test1Facet
            .connect(Rentee)
                .processRent(
                    streamNFT.address, 
                    1, 
                    30, 
                    ethers.constants.AddressZero,
                    [], 
                    0,
                    0, true ,{value: 1604166667663});
        console.log("Rent TOKEN DONE");
        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));

    })

    it('testing Expire rent', async () => {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066 } =
        await deployDiamond();
    
        const Stream7066 = await ethers.getContractFactory('StreamNFT')
        const streamNFT = await Stream7066.deploy(Renter.address)
        await streamNFT.deployed()
        console.log('StreamNFT deployed:', streamNFT.address)
        await streamNFT.connect(Renter).updateOwner(Renter.address)

        await streamNFT.connect(Renter).mint(Renter.address, 1);
        console.log("minted")
        await streamNFT.connect(Renter).setApprovalForAll(diamond.address, true);
        console.log("approved");
        

        const rentState1 = {
            rate: 48611111111,
            validityExpiry: 300,
            isFixed: false,
            doMint: false,
            fixedMinutes: 30,
            ownerShare: 0,
            rentExpiry: 0,
            rentee: ethers.constants.AddressZero,
            merkleRoot: ethers.constants.HashZero
        }
        
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        await test1Facet.connect(Renter).lendToken(
            streamNFT.address,
            1, // tokenId
            rentState1, // rentState
            300, // validityMinutes
            1, //noOfAssets
            false, //existingIndex
            0 //index
        );
        console.log("LEND TOKEN DONE")

        await test1Facet
            .connect(Rentee)
                .processRent(
                    streamNFT.address, 
                    1, 
                    30, 
                    ethers.constants.AddressZero,
                    [], 
                    0,
                    0, true ,{value: 1604166667663});

        const extend = 600 * 60;
        const blockNum = await ethers.provider.getBlockNumber();
        const now = await ethers.provider.getBlock(blockNum);
        await time.setNextBlockTimestamp(now.timestamp + extend);

        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));
        await test1Facet.connect(Renter).expireRent(streamNFT.address, 1,0);
        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));
    })

    it('testing streamSFT', async () => {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066 } =
        await deployDiamond();

        const StreamSFT = await ethers.getContractFactory('StreamSFT')
        const streamSFT1 = await StreamSFT.deploy(Renter.address)
        await streamSFT1.deployed()
        console.log('StreamNFT1 deployed:', streamSFT1.address)
        await streamSFT1.connect(Renter).updateOwner(Renter.address)

        await streamSFT1.connect(Renter).mint(Renter.address,"URI", 1);
        console.log("minted")
        await streamSFT1.connect(Renter).setApprovalForAll(diamond.address, true);
        console.log("approved");

        const rentState1 = {
            rate: 48611111111,
            validityExpiry: 300,
            isFixed: false,
            doMint: false,
            fixedMinutes: 30,
            ownerShare: 0,
            rentExpiry: 0,
            rentee: ethers.constants.AddressZero,
            merkleRoot: ethers.constants.HashZero
        }

        console.log("balance : ",await streamSFT1.connect(Renter).balanceOf(Renter.address, 1))
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        await test1Facet.connect(Renter).lendToken(
            streamSFT1.address,
            1, // tokenId
            rentState1, // rentState
            300, // validityMinutes
            1, //noOfAssets
            false, //existingIndex
            0 //index
        );
        console.log("LEND TOKEN DONE")

        console.log("balance : ",await streamSFT1.connect(Renter).balanceOf(diamond.address, 1))

        console.log("balance : ",await streamSFT1.connect(Renter).balanceOf(Renter.address, 1))
        await test1Facet
            .connect(Rentee)
                .processRent(
                    streamSFT1.address, 
                    1, 
                    30, 
                    ethers.constants.AddressZero,
                    [], 
                    0,
                    0, true ,{value: 1604166667663});
        console.log("Rent TOKEN DONE");
        console.log("balance : ",await streamSFT1.connect(Renter).balanceOf(diamond.address, 1))

        console.log("balance : ",await streamSFT1.connect(Rentee).balanceOf(Rentee.address, 1))
        
        //expire 
        const extend = 600 * 60;
        const blockNum = await ethers.provider.getBlockNumber();
        const now = await ethers.provider.getBlock(blockNum);
        await time.setNextBlockTimestamp(now.timestamp + extend);

        await test1Facet.connect(Renter).expireRent(streamSFT1.address, 1,0);
        console.log("balance : ", await streamSFT1.connect(Renter).balanceOf(diamond.address, 1))
    })
})