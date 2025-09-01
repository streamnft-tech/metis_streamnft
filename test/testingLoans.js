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

    it('testing Stream7066' ,async () => {
        const { diamond,
            deployer,
            Renter,
            Rentee,
            acc3,
            erc721NFT,
            erc7066NFT,
            erc1155NFT } =
            await deployDiamond();

        const StreamNFT = await ethers.getContractFactory('StreamNFT')
        const streamNFT = await StreamNFT.deploy(Renter.address)
        await streamNFT.deployed()
        console.log('Stream7066 deployed:', streamNFT.address)

        await streamNFT.connect(Renter).updateOwner(Renter.address);
        console.log("Owner Updated");
        await streamNFT.connect(Renter).mint(Renter.address, "URI");
        console.log("Minted");
        await streamNFT.connect(Renter).setApprovalForAll(diamond.address, true);
        console.log("approved");
        
        const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
        await test1Facet.connect(deployer).createLoanPool(streamNFT.address, 300, 0,0);
        console.log("Loan Pool Created");
        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));

        await test1Facet.connect(Rentee).addLoanOffer(100, 0,1, {value : 100});
        console.log("Loan Offer added")
        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));

        await test1Facet.connect(Renter).processLoan(0,0,1,0,false,false, {value : 1000});
        console.log("Processed Loan");
        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));

        await test1Facet.connect(Renter).repayLoan(streamNFT.address, 1, ethers.constants.AddressZero,0, {value : 100});
        console.log("owner of 1 : ",await streamNFT.connect(Renter).ownerOf(1));
    })

    it.only('testing Stream7066SFT', async () => {
        const { diamond,
            deployer,
            Renter,
            Rentee,
            acc3,
            erc721NFT,
            erc7066NFT,
            erc1155NFT } =
            await deployDiamond();
        
        const Stream7066SFT = await ethers.getContractFactory('StreamSFT')
        const stream7066SFT = await Stream7066SFT.deploy(Renter.address)
        await stream7066SFT.deployed()
        console.log('StreamSFT deployed:', stream7066SFT.address)

        await stream7066SFT.connect(Renter).updateOwner(Renter.address);
        console.log("Owner Updated");
        await stream7066SFT.connect(Renter).mint(Renter.address, "URI", 1);
        console.log("Minted");
        await stream7066SFT.connect(Renter).setApprovalForAll(diamond.address, true);
        console.log("approved");

        const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
        await test1Facet.connect(deployer).createLoanPool(stream7066SFT.address, 300, 0,0);
        console.log("Loan Pool Created");
        console.log("owner of 1 : ",await stream7066SFT.connect(Renter).balanceOf(Renter.address, 1));

        await test1Facet.connect(Rentee).addLoanOffer(100, 0,1, {value : 100});
        console.log("Loan Offer added")
        console.log("owner of 1 : ",await stream7066SFT.connect(Renter).balanceOf(Renter.address, 1));

        await test1Facet.connect(Renter).processLoan(0,0,1,0,false,false, {value : 1000});
        console.log("Processed Loan");
        console.log("owner of 1 : ",await stream7066SFT.connect(Renter).balanceOf(Renter.address, 1));

        await test1Facet.connect(Renter).repayLoan(stream7066SFT.address, 1, ethers.constants.AddressZero,0, {value : 100});
        console.log("owner of 1 : ",await stream7066SFT.connect(Renter).balanceOf(Renter.address, 1));
    })
})