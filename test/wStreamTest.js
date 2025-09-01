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
        await erc721NFT.connect(Renter).mint(Renter.address);

        // deploy ERC 7066 NFT and mint an NFT
        const ERC7066NFT = await ethers.getContractFactory('ERC7066NFT');
        let erc7066NFT = await ERC7066NFT.deploy();
        await erc7066NFT.deployed();
        await erc7066NFT.connect(Renter).mint(Renter.address);

        // deploy ERC1155 NFT and mint an NFT
        const ERC1155NFT = await ethers.getContractFactory('ERC1155Nft');
        let erc1155NFT = await ERC1155NFT.deploy();
        await erc1155NFT.deployed();
        await erc1155NFT.connect(Renter).mint(Renter.address, 3);

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

    async function deployLendTokenWithDoMint(validity) {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066, streamSFT } =
            await deployDiamond();

        let rent = {
            wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
            fee: 10000,
            token: ethers.constants.AddressZero,
        };
        let loan = {
            wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
            fee: 10000,
            token: ethers.constants.AddressZero,
        };
        const doMint = true;
        const test1Facet1 = await ethers.getContractAt('Stream', diamond.address)
        await test1Facet1
            .connect(deployer)
            .updatePartnerConfig(erc721NFT.address, rent, loan, doMint);


        validity = validity || 35;
        // approve contract
        await erc721NFT.connect(Renter).approve(diamond.address, 0);
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
        let txn;
        try {
            txn = await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                validity, // validityMinutes
                true, //isFixed
                10, // fixedMinutes
                0, // ownerShare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
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
        try {
            //domint was true
            txn = await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                validity, // validityMinutes
                true, //isFixed
                10, // fixedMinutes
                0, // ownerShare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
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

    async function deployLendToken_nomint(validity) {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066 } =
            await deployDiamond();
        validity = validity || 35;
        // approve contract
        await erc721NFT.connect(Renter).approve(diamond.address, 0);
        const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
        expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
        let txn;
        // address, tokenId,ratePerMinute,validityMinutes,isFixed,
        try {
            txn = await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                validity, // validityMinutes
                true, //isFixed
                10, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000',// merkleRoot
                0
            );
            // //console.log("txn " + txn)
            // //console.log("Init rent done");
        } catch (e) {
            // //console.log("txn " + txn)
            // //console.log(e);
        }
        expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
        return { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT, erc1155NFT, stream7066 };
    }

    async function deployLendTokenNoMint() {
        // approve contract
        erc721NFT.connect(Renter).approve(diamond.address, 0);
        // domint was true
        await diamond.connect(Renter).lendToken(
            erc721NFT.address,
            0, // tokenId
            1, // ratePerMinute
            35, // validityMinutes
            true, //isFixed
            10, // fixedMinutes
            0, // privateRental
            '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
        );
        return { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT };
    }

    async function deployLoanPool() {
        const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, erc1155NFT } =
            await deployDiamond();
        const [LoanProvider, LoanTaker, acc3] = await ethers.getSigners();

        await erc721NFT.connect(LoanTaker).mint(LoanTaker.address);
        await erc721NFT.connect(acc3).mint(acc3.address);

        let param = {
            initializerKey: ethers.constants.AddressZero,
            tokenAddress: erc721NFT.address,
            loanDurationInMinutes: 70,
            // gracePeriodInMinutes: 30,
            apy: 10,
            interestRateLender: 10000,
            interestRateProtocol: 10,
            totalLoanOffer: 10,
            lastBidAmount: 0,
            bidNftFloorPrice: 0,
        };
        const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
        await test1Facet.connect(deployer).createLoanPool(erc721NFT.address, 70, 10000, 10);

        const Storage = await ethers.getContractAt('Getter', diamond.address)
        const loanPoolArray = await Storage.connect(Rentee).getLoanPoolLength();
        expect(loanPoolArray).to.eq(1);

        return { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT, erc1155NFT };
    }

    async function deployLoanOffer() {
        const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT, erc1155NFT } =
            await deployLoanPool();

        let param = {
            bidderPubkey: LoanProvider.address,
            bidAmount: ethers.utils.parseEther('1'),
            poolIndex: 0,
            totalBids: 1,
            pendingLoans: 0,
        };
        const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
        await test1Facet
            .connect(LoanProvider)
            .addLoanOffer(ethers.utils.parseEther('1'), 0, 1, { value: ethers.utils.parseEther('1') });
        return { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT, erc1155NFT };
    }

    describe('lendToken', () => {

        it('Should revert with Invalid Initialiser', async () => {

            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee, erc1155NFT } =
                await deployLendToken();
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            const test1Facet2 = await ethers.getContractAt('Getter', diamond.address)
            // console.log(test1Facet2)
            // console.log(test1Facet)
            // expect(await test1Facet2.getAssetManager(erc721NFT.address, 0)).to.eq(Renter.address)
            let data = await test1Facet2.getAssetManager(erc721NFT.address, 0)
            console.log(data)
            console.log(Rentee.address)
            console.log(Renter.address)
            await expect(
                test1Facet.connect(Rentee).lendToken(
                    erc721NFT.address,
                    0, // tokenId
                    1, // ratePerMinute
                    35, // validityMinutes
                    true, //isFixed
                    30, // fixedMinutes
                    20, // ownerShare
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    0
                )
            ).to.be.revertedWithCustomError(test1Facet, "InvalidInitializer");
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert as msg.sender is not token owner', async () => {
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee, erc1155NFT } =
                await deployDiamond();

            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            console.log("SHould revert as msg.sender is not token owner")
            await expect(
                // domint was true
                test1Facet.connect(Rentee).lendToken(
                    erc721NFT.address,
                    0, // tokenId
                    1, // ratePerMinute
                    35, // validityMinutes
                    true, //isFixed
                    30, // fixedMinutes
                    0, // privateRental
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    0
                )
            ).to.be.revertedWithCustomError(test1Facet, `InvalidUser`);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);;
            expect(assetManager[0]).to.eq(ethers.constants.AddressZero);
            const rentState = ethers.BigNumber.from('0'); // INIT
            console.log(assetManager.state)
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
        }); //don

        it('Should be able to lend an NFT (ERC721)', async () => {
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee, erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)

            console.log(Renter.address, diamond.address, erc721NFT.address)
            // domint was true
            await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                3
            );

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            expect(assetManager[0]).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should revert with InvalidTimeDuration - test 1', async () => {
            const { diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployDiamond();
            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // validity minutes < Fixed minutes
            // domint was true
            await expect(
                test1Facet.connect(Renter).lendToken(
                    erc721NFT.address, // tokenAddress
                    0, // tokenId
                    1, // ratePerMinute
                    25, // validityMinutes
                    true, //isFixed
                    30, // fixedMinutes
                    0, // privateRental
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    0
                )
            ).to.be.revertedWithCustomError(test1Facet, `InvalidTimeDuration`);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            expect(assetManager[0]).to.eq(ethers.constants.AddressZero);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
        }); //don

        it('Should revert with InvalidTimeDuration - test 2', async () => {
            const { diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployDiamond();
            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // Fixed minutes < minimum rent minutes
            // domint was true
            await expect(
                test1Facet.connect(Renter).lendToken(
                    erc721NFT.address, // tokenAddress
                    0, // tokenId
                    1, // ratePerMinute
                    25, // validityMinutes
                    true, //isFixed
                    0, // fixedMinutes
                    0, // ownershare
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    0
                )
            ).to.be.revertedWithCustomError(test1Facet, `InvalidTimeDuration`);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            expect(assetManager[0]).to.eq(ethers.constants.AddressZero);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
        }); //don

        it('Should revert with InvalidTimeDuration - test 3', async () => {
            const { diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployDiamond();
            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // Not fixed, validity minutes < minimum rent duration
            // domint was true
            await expect(
                test1Facet.connect(Renter).lendToken(
                    erc721NFT.address, // tokenAddress
                    0, // tokenId
                    1, // ratePerMinute
                    0, // validityMinutes
                    false, //isFixed
                    0, // fixedMinutes
                    0, // privateRental
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    0
                )
            ).to.be.revertedWithCustomError(test1Facet, `InvalidTimeDuration`);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            expect(assetManager[0]).to.eq(ethers.constants.AddressZero);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
        }); //don

        it('Should be able to lend an NFT (ERC1155)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            // domint was true
            console.log("erc: ", erc1155NFT.address)
            await test1Facet.connect(Renter).lendToken(
                erc1155NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // ownershare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                1
            );

            // check if the owner of the token is the contract now
            expect(await erc1155NFT.balanceOf(diamond.address, 0)).to.equal(1);
            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc1155NFT.address, 0);
            // console.log(assetManager)
            // expect(assetManager.rentState.rentee).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            // expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should be able to lend an NFT (ERC721)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc721NFT.connect(Renter).approve(diamond.address, 0);
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // domint was true
            await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // ownershare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            // check if the owner of the token is the contract now(both minted and original NFT)
            expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            expect(assetManager.rentState.rentee).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should be able to lend an NFT (ERC7066)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc7066NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            // domint was true

            await test1Facet.connect(Renter).lendToken(
                erc7066NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            // check if the owner of the token is the contract now
            expect(await erc7066NFT.ownerOf(0)).to.equal(diamond.address);
            // check if new ERC7066 is not minted
            expect(await erc7066NFT.totalSupply()).to.be.equal(1);
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc7066NFT.address, 0);
            expect(assetManager.rentState.rentee).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should be able to lend an NFT (ERC20)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc7066NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            // domint was true

            await test1Facet.connect(Renter).lendToken(
                erc7066NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            // check if the owner of the token is the contract now
            expect(await erc7066NFT.ownerOf(0)).to.equal(diamond.address);
            // check if new ERC7066 is not minted
            expect(await erc7066NFT.totalSupply()).to.be.equal(1);
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc7066NFT.address, 0);
            expect(assetManager.rentState.rentee).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
        }); //don
    });

    describe('processRent', () => {

        it('Should revert with Invalid Time Duration', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            // rent for 35 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await expect(
                test1Facet.connect(Rentee).processRent(erc721NFT.address, 0, 30, ethers.constants.AddressZero, [], Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidTimeDuration');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert with requested time more than validity time', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            // rent for 30 mins but validity time is 35 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await expect(
                test1Facet.connect(Rentee).processRent(erc721NFT.address, 0, 40, ethers.constants.AddressZero, [], Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'ExceededValidity');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to rent an NFT - ERC721', async () => {
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
        }); //don

        it('Should be able to rent an NFT - ERC721 - nftdiscount', async () => {
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

            const ERC721NFT = await ethers.getContractFactory('CommonNFT');
            let nft = await ERC721NFT.deploy();
            await nft.deployed();
            await nft.connect(Rentee).mint(Rentee.address);

            const Facet = await ethers.getContractAt('Stream', diamond.address)
            await Facet
                .connect(deployer)
                .updateNFTDiscount(nft.address, 10, 10);

            erc721NFT.connect(Renter).approve(diamond.address, 0);

            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, nft.address, [], Renter.address, 0, { value: 1010 });

            expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert with "Already rented" ', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            // rent for 30 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            await expect(
                test1Facet
                    .connect(deployer)
                    .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 })
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidAssetState');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to rent an NFT - ERC7066', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();

            // approve contract
            await erc7066NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)

            // give out for rent
            // domint was true
            console.log("Renter is: " + Renter.address)
            console.log("Diamond is: " + diamond.address)
            await test1Facet.connect(Renter).lendToken(
                erc7066NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            // rent for 30 mins
            await test1Facet
                .connect(Rentee)
                .processRent(erc7066NFT.address, 0, 30, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1033 });
            expect(await erc7066NFT.ownerOf(0)).to.equal(diamond.address);
            // expect(await erc7066NFT.lockerOf(0)).to.equal(diamond.address);
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc7066NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should be able to rent an NFT - ERC7066 - nftdiscount', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();

            const ERC721NFT = await ethers.getContractFactory('CommonNFT');
            let nft = await ERC721NFT.deploy();
            await nft.deployed();
            await nft.connect(Rentee).mint(Rentee.address);

            const Facet = await ethers.getContractAt('Stream', diamond.address)
            await Facet
                .connect(deployer)
                .updateNFTDiscount(nft.address, 10, 10);

            // approve contract
            await erc7066NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)

            // give out for rent
            // domint was true
            console.log("Renter is: " + Renter.address)
            console.log("Diamond is: " + diamond.address)
            await test1Facet.connect(Renter).lendToken(
                erc7066NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            // rent for 30 mins
            await test1Facet
                .connect(Rentee)
                .processRent(erc7066NFT.address, 0, 30, nft.address, [], Renter.address, 0, { value: 1032 });
            expect(await erc7066NFT.ownerOf(0)).to.equal(diamond.address);
            // expect(await erc7066NFT.lockerOf(0)).to.equal(diamond.address);
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc7066NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should revert with "Private Rental" ', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc721NFT.connect(Renter).approve(diamond.address, 0);

            // merkle tree
            let balances = [
                {
                    addr: '0xb7e390864a90b7b923c9f9310c6f98aafe43f707'
                },
                {
                    addr: '0xea674fdde714fd979de3edf0f56aa9716b898ec8'
                },
                {
                    addr: '0xea674fdde714fd979de3edf0f56aa9546b898ec8'
                },
                {
                    addr: '0xea674fdde714fd979de3edf0f56aa8916b898ec8'
                }
            ];
            const leafNodes = balances.map((balance) =>
                ethers.utils.keccak256(Buffer.from(balance.addr.replace('0x', ''), 'hex'))
            );
            const merkleTree = new MerkleTree(leafNodes, ethers.utils.keccak256, {
                sortPairs: true,
            });
            // lend token for rent
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
            // domint was true

            const temp = await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                //TODO : fix this
                0, //privateRental
                merkleTree.getHexRoot(), // merkleRoot
                0
            );
            await expect(
                test1Facet
                    .connect(deployer)
                    .processRent(erc721NFT.address, 0, 30, ethers.constants.AddressZero, [], Renter.address, 0, { value: 33 })
            ).to.be.revertedWithCustomError(test1Facet, 'PrivateRental');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should pass for "Private Rental" ', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc721NFT.connect(Renter).approve(diamond.address, 0);

            // merkle tree
            let balances = [
                {
                    addr: Rentee.address
                },
                {
                    addr: '0xea674fdde714fd979de3edf0f56aa9716b898ec8'
                },
                {
                    addr: '0xea674fdde714fd979de3edf0f56aa9546b898ec8'
                },
                {
                    addr: '0xea674fdde714fd979de3edf0f56aa8916b898ec8'
                }
            ];
            const leafNodes = balances.map((balance) =>
                ethers.utils.keccak256(Buffer.from(balance.addr.replace('0x', ''), 'hex'))
            );
            const merkleTree = new MerkleTree(leafNodes, ethers.utils.keccak256, {
                sortPairs: true,
            });
            // lend token for rent
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // domint was true

            await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                //TODO : fix this
                0, //privateRental
                merkleTree.getHexRoot(), // merkleRoot
                0
            );
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 30, ethers.constants.AddressZero, merkleTree.getHexProof(leafNodes[0]), Renter.address, 0, { value: 1033 });

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to rent to whitelisted account', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // lend token for rent
            // domint was true

            await test1Facet.connect(Renter).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                //TODO : fix below
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 30, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1033 });

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to rent an NFT with protocol fee', async () => {
            console.log("here")
            const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066, streamSFT } =
                await deployDiamond();
            console.log("here")
            let rent = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };
            let loan = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };

            const doMint = false;
            const testFacet1 = await ethers.getContractAt('Stream', diamond.address)
            await testFacet1
                .connect(deployer)
                .updatePartnerConfig(erc7066NFT.address, rent, loan, doMint);


            let validity = 35;
            // approve contract
            await erc7066NFT.connect(Renter).approve(diamond.address, 0);
            // erc1155NFT.connect
            const testFacet2 = await ethers.getContractAt('RentUtil', diamond.address)
            let txn;
            try {
                txn = await testFacet2.connect(Renter).lendToken(
                    erc7066NFT.address,
                    0, // tokenId
                    1, // ratePerMinute
                    validity, // validityMinutes
                    true, //isFixed
                    10, // fixedMinutes
                    0, // ownerShare
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    3
                );
                // //console.log("txn " + txn)
                console.log("Init rent done");
            } catch (e) {
                console.log("txn " + txn)
                console.log(e);
            }
            expect(await erc7066NFT.ownerOf(0)).to.equal(diamond.address);

            console.log("here2")

            // fund rentee wallet
            await network.provider.send('hardhat_setBalance', [
                Rentee.address,
                '0x142FE442092FD00',
            ]);

            console.log("i am here")
            // rent for 200 mins
            const testFacet = await ethers.getContractAt('RentUtil', diamond.address)
            await testFacet
                .connect(Rentee)
                .processRent(erc7066NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1012 });

            // const balanceAfter = await ethers.provider.getBalance(
            //     feeStruct.treasury
            // );
            console.log("i am here2")
            // expect(await erc7066NFT.ownerOf(0)).to.equal(Rentee.address);
            // console.log(stream7066)
            // expect(balanceAfter.gt(balanceBefore)).to.be.true;

            // // STATE CHECKS
            // const Storage = await ethers.getContractAt('Getter', diamond.address)
            // const assetManager = await Storage.connect(Rentee).getAssetManager(erc7066NFT.address, 0);
            // expect(assetManager.state).to.eq(rentState);
        }); //done

        it('Should revert with Insufficient funds', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken_nomint();
            // rent for 30 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await expect(
                test1Facet.connect(Rentee).processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InsufficientFunds');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it.only('Should be able to rent an NFT (ERC1155)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            // domint was true
            console.log("erc: ", erc1155NFT.address)
            await test1Facet.connect(Renter).lendToken(
                erc1155NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // ownershare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                1
            );

            // check if the owner of the token is the contract now
            expect(await erc1155NFT.balanceOf(diamond.address, 0)).to.equal(1);
            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getFungibleAssetMaster(erc1155NFT.address, 0, Renter.address);
            console.log(assetManager)
            expect(assetManager.rentState.rentee).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);

            await test1Facet
                .connect(Rentee)
                .processRent(erc1155NFT.address, 0, 30, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1033 });

        }); //don

        it('Should be able to rent an NFT - ERC11555 - doMint', async () => {
            const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066, streamSFT } =
                await deployDiamond();
            console.log("here")
            let rent = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };
            let loan = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };

            const doMint = true;
            const testFacet1 = await ethers.getContractAt('Stream', diamond.address)
            await testFacet1
                .connect(deployer)
                .updatePartnerConfig(erc1155NFT.address, rent, loan, doMint);


            let validity = 35;
            // approve contract
            await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
            // erc1155NFT.connect
            const testFacet2 = await ethers.getContractAt('RentUtil', diamond.address)
            let txn;
            try {
                txn = await testFacet2.connect(Renter).lendToken(
                    erc1155NFT.address,
                    0, // tokenId
                    1, // ratePerMinute
                    validity, // validityMinutes
                    true, //isFixed
                    10, // fixedMinutes
                    0, // ownerShare
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    3
                );
                // //console.log("txn " + txn)
                console.log("Init rent done");
            } catch (e) {
                console.log("txn " + txn)
                console.log(e);
            }
            // expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            console.log("here in test")
            // rent for 10 mins

            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // function processRent(address tokenAddress, uint256 tokenId, uint256 durationMinutes, address _nftDiscount, bytes32[] calldata proof, address renter, uint256 index) external payable nonReentrant{
            console.log("here in test2")
            await test1Facet
                .connect(Rentee)
                .processRent(erc1155NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1012 });


            await time.increase(3600);
            await test1Facet.connect(Renter).expireRent(erc1155NFT.address, 0, Renter.address, 0);

            // expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // ERC11555
            // checking token transfer
            // he should not be able to transfer
            // while expiring the token it should come back to contract

            // // STATE CHECKS
            // const Storage = await ethers.getContractAt('Getter', diamond.address)
            // const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            // const rentState = ethers.BigNumber.from('1'); // RENT
            // expect(assetManager.state).to.eq(rentState);
            // expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            // expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

    });

    describe('expireRent', () => {
        it('Should revert with "Not in rented state" ', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await expect(
                test1Facet.connect(deployer).expireRent(erc721NFT.address, 0, Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidAssetState');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4');
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert with "R4" ', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)

            // rent for 30 mins
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            await expect(
                test1Facet.connect(deployer).expireRent(erc721NFT.address, 0, Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'PendingExpiry');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1');
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to expireRent', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();
            // rent for 30 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            // go forward in time
            await time.increase(3600);

            await test1Facet.connect(deployer).expireRent(erc721NFT.address, 0, Renter.address, 0);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to expireRent - nftdiscount', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();

            const ERC721NFT = await ethers.getContractFactory('CommonNFT');
            let nft = await ERC721NFT.deploy();
            await nft.deployed();
            await nft.connect(Rentee).mint(Rentee.address);

            const Facet = await ethers.getContractAt('Stream', diamond.address)
            await Facet
                .connect(deployer)
                .updateNFTDiscount(nft.address, 10, 10);
            // rent for 30 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, nft.address, [], Renter.address, 0, { value: 1010 });

            // go forward in time
            await time.increase(3600);

            await test1Facet.connect(deployer).expireRent(erc721NFT.address, 0, Renter.address, 0)

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to expireRent (ERC1155)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            // domint was true
            console.log("erc: ", erc1155NFT.address)
            await test1Facet.connect(Renter).lendToken(
                erc1155NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // ownershare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                1
            );

            // check if the owner of the token is the contract now
            expect(await erc1155NFT.balanceOf(diamond.address, 0)).to.equal(1);
            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc1155NFT.address, 0);
            // console.log(assetManager)
            // expect(assetManager.rentState.rentee).to.eq(Renter.address);
            const rentState = ethers.BigNumber.from('4'); // STALE
            // expect(assetManager.state).to.eq(rentState);

            await test1Facet
                .connect(Rentee)
                .processRent(erc1155NFT.address, 0, 30, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1033 });

            // go forward in time
            await time.increase(3600);
            await test1Facet.connect(Renter).expireRent(erc1155NFT.address, 0, Renter.address, 0);

        }); //done
    });

    describe('cancelLendToken', () => {

        it('Should revert with "R5" ', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await expect(
                test1Facet.connect(Rentee).cancelLendToken(erc721NFT.address, 0, Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidUser');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert with "Asset is Rented Out" ', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // rent for 30 mins
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });
            await expect(
                test1Facet.connect(Renter).cancelLendToken(erc721NFT.address, 0, Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'AlreadyRentedOut');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should cancelLendToken (ERC721)', async () => {
            const { diamond, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT } =
                await deployLendToken();
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet.connect(Renter).cancelLendToken(erc721NFT.address, 0, Renter.address, 0);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
        }); //don

        it('Should cancelLendToken (ERC7066)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();

            // approve contract
            await erc7066NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // address, tokenId,ratePerMinute,validityMinutes,isFixed,
            // domint was true

            await test1Facet.connect(Renter).lendToken(
                erc7066NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            await test1Facet.connect(Renter).cancelLendToken(erc7066NFT.address, 0, Renter.address, 0);
            expect(await erc7066NFT.ownerOf(0)).to.be.equal(Renter.address);
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
        }); //don

        it('Should cancelLendToken (ERC1155)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();
            // approve contract
            await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet.connect(Renter).lendToken(
                erc1155NFT.address,
                0, // tokenId
                1, // ratePerMinute
                35, // validityMinutes
                true, //isFixed
                30, // fixedMinutes
                0, // ownershare
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                3
            );

            // // check if the owner of the token is the contract now
            // // expect(await erc1155NFT.balanceOf(diamond.address, 0)).to.equal(1);
            // // // STATE CHECKS
            // // const Storage = await ethers.getContractAt('Getter', diamond.address)
            // // const assetManager = await Storage.connect(Rentee).getAssetManager(erc1155NFT.address, 0);
            // // console.log(assetManager)
            // // expect(assetManager.rentState.rentee).to.eq(Renter.address);
            // const rentState = ethers.BigNumber.from('4'); // STALE
            // // expect(assetManager.state).to.eq(rentState);

            // // await test1Facet
            // //     .connect(Renter)
            // //     .processRent(erc1155NFT.address, 0, 30, ethers.constants.AddressZero, [], 0, { value: 1033 });

            // const test2Facet = await ethers.getContractAt('Getter', diamond.address)
            // // let fasset = await test2Facet.connect(Renter).getFungibleAssetManager(erc1155NFT.address, 0, Renter.address, 0);
            // // console.log(fasset)

            // // await test1Facet.connect(Rentee).cancelLendToken(erc1155NFT.address, 0, Renter.address, 0);

        }); //don

    });

    describe('Add loan offer', () => {
        it('Should revert with "Insufficient Funds: ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } =
                await deployLoanPool();
            let param = {
                bidderPubkey: LoanProvider.address,
                bidAmount: 1,
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await expect(
                test1Facet.connect(LoanProvider).addLoanOffer(1, 0, 1, { value: 0 })
            ).to.be.revertedWithCustomError(test1Facet, 'InsufficientFunds');

            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const loanPoolArray = await Storage.connect(LoanProvider).getLoanPoolLength();
            expect(loanPoolArray).to.eq(1);
        }); //don

        it('Should create a loan offer', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } =
                await deployLoanPool();
            let param = {
                bidderPubkey: LoanProvider.address,
                bidAmount: 1,
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanProvider).addLoanOffer(1, 0, 1, { value: 1 });

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
            }
        }); //don
    });

    describe('Process Loan', () => {

        it('Should revert with "Not Up For Loan" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });
            await expect(
                test1Facet.connect(acc3).processLoan(0, 0, 0, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidAssetState');
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('2'); // LOAN
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert with "Invalid User" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await expect(
                test1Facet.connect(acc3).processLoan(0, 0, 0, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidUser');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);
        }); //don

        it('Should revert with "L2" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)

            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            await erc721NFT.connect(LoanTaker).approve(diamond.address, 1);
            await expect(
                test1Facet.connect(LoanTaker).processLoan(0, 0, 1, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'AllOffersTaken');
        }); //don

        it('Should Process the loan for loan taker', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            balanceBefore = await ethers.provider.getBalance(LoanTaker.address);

            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)

            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            balanceAfter = await ethers.provider.getBalance(LoanTaker.address);

            expect(balanceAfter).gt(balanceBefore);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('2'); // LOAN
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
                // ////console.log(loanOffer)
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
        }); //don

        it('Should Process the loan for loan taker - ERC1155', async () => {
            const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee } = await deployDiamond();
            const [LoanProvider, LoanTaker, acc3] = await ethers.getSigners();

            // deploy ERC1155 NFT and mint an NFT
            const ERC1155NFT = await ethers.getContractFactory('ERC1155Nft');
            let erc1155NFT = await ERC1155NFT.deploy();
            await erc1155NFT.deployed();
            await erc1155NFT.connect(LoanTaker).mint(LoanTaker.address, 10);

            let param = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc1155NFT.address,
                loanDurationInMinutes: 70,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10000,
                interestRateProtocol: 10,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };

            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc1155NFT.address, 70, 10000, 10);

            param = {
                bidderPubkey: LoanProvider.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(LoanProvider)
                .addLoanOffer(ethers.utils.parseEther('1'), 0, 1, { value: ethers.utils.parseEther('1') });

            // approve
            await erc1155NFT.connect(LoanTaker).setApprovalForAll(diamond.address, true);


            balanceBefore = await ethers.provider.getBalance(LoanTaker.address);


            console.log(LoanTaker.address, erc1155NFT.address, 0, diamond.address)

            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            balanceAfter = await ethers.provider.getBalance(LoanTaker.address);

            expect(balanceAfter).gt(balanceBefore);

            // STATE CHECKS
            // const Storage = await ethers.getContractAt('Getter', diamond.address)
            // const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            // const rentState = ethers.BigNumber.from('2'); // LOAN
            // expect(assetManager.state).to.eq(rentState);
            // expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);

            // // LOAN STATE CHECKS
            // {
            //     const Storage = await ethers.getContractAt('Getter', diamond.address)
            //     const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
            //     const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
            //     expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
            //     expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
            //     // ////console.log(loanOffer)
            //     expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            // }
        }); //don
    });

    describe('Repay Loan', () => {

        it('should revert with "Invalid User" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            // take loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // repay loan by another person
            await expect(
                test1Facet.connect(acc3).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, LoanProvider.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidUser');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('2'); // LOAN
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
        }); //don

        it('Should revert with "Insufficient Funds" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            // take loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // repay loan
            await expect(
                test1Facet.connect(LoanTaker).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, LoanProvider.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InsufficientFunds');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('2'); // LOAN
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
        }); //don

        it('Should revert with "NotUpForLoan" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await expect(
                test1Facet.connect(LoanTaker).repayLoan(erc721NFT.address, 0, erc721NFT.address, LoanProvider.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidAssetState');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('Should repay loan', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            // take loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
            // repay loan
            await test1Facet.connect(LoanTaker).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, LoanProvider.address, 0, {
                value: ethers.utils.parseEther('1.11'),
            });
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('Should repay loan - nftdiscount', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            const ERC721NFT = await ethers.getContractFactory('CommonNFT');
            let nft = await ERC721NFT.deploy();
            await nft.deployed();
            await nft.connect(deployer).mint(LoanProvider.address);

            const Facet = await ethers.getContractAt('Stream', diamond.address)
            await Facet
                .connect(LoanProvider)
                .updateNFTDiscount(nft.address, 10, 10);

            // take loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
            // repay loan
            await test1Facet.connect(LoanTaker).repayLoan(erc721NFT.address, 0, nft.address, LoanProvider.address, 0, {
                value: ethers.utils.parseEther('1.109'),
            });
            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('Should repay loan - ERC1155', async () => {
            const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee } = await deployDiamond();
            const [LoanProvider, LoanTaker, acc3] = await ethers.getSigners();

            // deploy ERC1155 NFT and mint an NFT
            const ERC1155NFT = await ethers.getContractFactory('ERC1155Nft');
            let erc1155NFT = await ERC1155NFT.deploy();
            await erc1155NFT.deployed();
            await erc1155NFT.connect(LoanTaker).mint(LoanTaker.address, 10);

            let param = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc1155NFT.address,
                loanDurationInMinutes: 70,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10000,
                interestRateProtocol: 10,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };

            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc1155NFT.address, 70, 10000, 10);

            param = {
                bidderPubkey: LoanProvider.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(LoanProvider)
                .addLoanOffer(ethers.utils.parseEther('1'), 0, 1, { value: ethers.utils.parseEther('1') });

            // approve
            await erc1155NFT.connect(LoanTaker).setApprovalForAll(diamond.address, true);


            balanceBefore = await ethers.provider.getBalance(LoanTaker.address);


            console.log(LoanTaker.address, erc1155NFT.address, 0, diamond.address)

            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            balanceAfter = await ethers.provider.getBalance(LoanTaker.address);

            expect(balanceAfter).gt(balanceBefore);

            // repay loan
            await test1Facet.connect(LoanTaker).repayLoan(erc1155NFT.address, 0, ethers.constants.AddressZero, LoanTaker.address, 0, {
                value: ethers.utils.parseEther('1.11'),
            });

            // // STATE CHECKS
            // const Storage = await ethers.getContractAt('Getter', diamond.address)
            // const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            // const rentState = ethers.BigNumber.from('2'); // LOAN
            // expect(assetManager.state).to.eq(rentState);
            // expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);

            // // LOAN STATE CHECKS
            // {
            //     const Storage = await ethers.getContractAt('Getter', diamond.address)
            //     const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
            //     const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
            //     expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
            //     expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
            //     // ////console.log(loanOffer)
            //     expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            // }
        }); //don

    });

    describe('Expire Loan', () => {
        it('Should revert with "Loan not expired yet" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            // take loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // expire loan
            await expect(
                test1Facet.connect(acc3).expireLoan(erc721NFT.address, 0, LoanProvider.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'PendingExpiry');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('2'); // LOAN
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
        }); //don

        it('Should revert with "InvalidStateForExpiry" ', async () => {
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployDiamond();
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await expect(
                test1Facet.connect(deployer).expireLoan(erc721NFT.address, 0, Renter.address, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidAssetState');

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Rentee).getLoanPoolLength();
                expect(loanPoolArray).to.eq(0);
            }
        }); //don

        it('Should expire the loan ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            // take loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // move to 70 later
            await time.increase(4200);

            // expire loan
            await test1Facet.connect(acc3).expireLoan(erc721NFT.address, 0, LoanProvider.address, 0);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('0'); // INIT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.be.equal(LoanProvider.address);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('Should expire loan - ERC1155', async () => {
            const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee } = await deployDiamond();
            const [LoanProvider, LoanTaker, acc3] = await ethers.getSigners();

            // deploy ERC1155 NFT and mint an NFT
            const ERC1155NFT = await ethers.getContractFactory('ERC1155Nft');
            let erc1155NFT = await ERC1155NFT.deploy();
            await erc1155NFT.deployed();
            await erc1155NFT.connect(LoanTaker).mint(LoanTaker.address, 10);

            let param = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc1155NFT.address,
                loanDurationInMinutes: 70,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10000,
                interestRateProtocol: 10,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };

            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc1155NFT.address, 70, 10000, 10);

            param = {
                bidderPubkey: LoanProvider.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(LoanProvider)
                .addLoanOffer(ethers.utils.parseEther('1'), 0, 1, { value: ethers.utils.parseEther('1') });

            // approve
            await erc1155NFT.connect(LoanTaker).setApprovalForAll(diamond.address, true);


            balanceBefore = await ethers.provider.getBalance(LoanTaker.address);


            console.log(LoanTaker.address, erc1155NFT.address, 0, diamond.address)

            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            balanceAfter = await ethers.provider.getBalance(LoanTaker.address);

            expect(balanceAfter).gt(balanceBefore);
            const test2Facet = await ethers.getContractAt('Getter', diamond.address)

            // move to 70 later
            await time.increase(4200);

            // expire loan
            await test1Facet.connect(LoanTaker).expireLoan(erc1155NFT.address, 0, Renter.address, 0);

            // STATE CHECKS
            // const Storage = await ethers.getContractAt('Getter', diamond.address)
            // const assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
            // const rentState = ethers.BigNumber.from('2'); // LOAN
            // expect(assetManager.state).to.eq(rentState);
            // expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);

            // // LOAN STATE CHECKS
            // {
            //     const Storage = await ethers.getContractAt('Getter', diamond.address)
            //     const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
            //     const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
            //     expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
            //     expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
            //     // ////console.log(loanOffer)
            //     expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            // }
        }); //don

    });

    describe('Utility functions', () => {
        // it('Should not Update discount', async () => {
        //     const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
        //         await deployLendToken();
        //     // use enum the right way :
        //     const rentState = ethers.BigNumber.from('1');
        //     const test1Facet = await ethers.getContractAt('Stream', diamond.address)
        //     await expect(
        //         test1Facet
        //             .connect(Renter)
        //             .updateDiscount(erc721NFT.address, rentState, 5)
        //     ).to.be.revertedWith('E3');
        // });
        //reason: check admin is commented out in the contract


        it('Should be able to update discount', async () => {
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // use enum the right way :
            const rentState = ethers.BigNumber.from('1');
            const test1Facet = await ethers.getContractAt('Stream', diamond.address)
            //impersonate admin
            const adminAddress = '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd';
            await impersonateAccount(adminAddress);
            const adminWallet = await ethers.getSigner(adminAddress);

            // fund admin wallet
            await network.provider.send('hardhat_setBalance', [
                '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd',
                '0x142FE442092FD00',
            ]);

            await test1Facet
                .connect(deployer)
                .updateDiscount(erc721NFT.address, rentState, 5);
        }); //done: but why impersonate wallet

        // it('Should not Update protocol fee', async () => {
        //     const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
        //         await deployLendToken();
        //     // use enum the right way :
        //     const rentState = ethers.BigNumber.from('1');
        //     let feeStruct = {
        //         treasury: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //         value: 5,
        //         paymentToken: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //     };

        //     const test1Facet = await ethers.getContractAt('Stream', diamond.address)
        //     await expect(
        //         test1Facet
        //             .connect(deployer)
        //             .updateProtocolFee(erc721NFT.address, rentState, feeStruct)
        //     ).to.be.revertedWith('E3');
        // });
        // reason: check admin is commented out in the contract

        //done

        it('Should be able to update protocol fee', async () => {
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // use enum the right way :
            const rentState = ethers.BigNumber.from('1');
            let rent = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 5,
                token: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
            };
            let loan = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 5,
                token: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
            };
            const test1Facet = await ethers.getContractAt('Stream', diamond.address)
            //impersonate admin
            const adminAddress = '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd';
            await impersonateAccount(adminAddress);
            const adminWallet = await ethers.getSigner(adminAddress);

            // fund admin wallet
            await network.provider.send('hardhat_setBalance', [
                '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd',
                '0x142FE442092FD00',
            ]);

            // function updatePartnerConfig(address tokenAddress, StreamLibrary.Treasury calldata rent, 
            //     StreamLibrary.Treasury calldata loan, bool doMint)

            await test1Facet
                .connect(deployer)
                .updatePartnerConfig(erc721NFT.address, rent, loan, false);
        }); //done: but why impersonate wallet

        // it("Should be able to update protocol fee => ERC20 Token", async function () {
        //     const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
        //         await deployLendToken();
        //     // use enum the right way :
        //     const rentState = ethers.BigNumber.from('1');


        //     const ERC20 = await ethers.getContractFactory('MyERC20');
        //     let erc20 = await ERC20.deploy();
        //     await erc20.deployed();
        //     await erc20.connect(Renter).mint(Renter.address, 1000);

        //     // approve
        //     await erc20.connect(Renter).approve(diamond.address, 1100);

        //     let feeStruct = {
        //         treasury: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //         value: 5,
        //         paymentToken: erc20.address,
        //         doMint: false
        //     };
        //     let rent = {
        //         wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //         fee: 5,
        //         token: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //     };
        //     let loan = {
        //         wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //         fee: 5,
        //         token: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
        //     };
        //     const test1Facet = await ethers.getContractAt('Stream', diamond.address)
        //     //impersonate admin
        //     const adminAddress = '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd';
        //     await impersonateAccount(adminAddress);
        //     const adminWallet = await ethers.getSigner(adminAddress);

        //     // fund admin wallet
        //     await network.provider.send('hardhat_setBalance', [
        //         '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd',
        //         '0x142FE442092FD00',
        //     ]);
        //     await test1Facet
        //         .connect(adminWallet)
        //         .updatePartnerConfig(erc20.address, rentState, feeStruct);
        // }); 

        it('Should test the fallback function ', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployDiamond();

            const amount = ethers.utils.parseEther('1.0');

            // Send Ether to the contract's fallback function
            await deployer.sendTransaction({
                to: diamond.address,
                value: amount,
            });

            // Check the contract's balance
            const contractBalance = await ethers.provider.getBalance(diamond.address);
            expect(contractBalance).to.equal(amount);
        }); //don
    });


    /////////////////////////
    /// INTEGRATION TESTS ///
    /////////////////////////

    describe('Integration tests', () => {

        it('Should be able to rent and then loan the token', async () => {
            // given for rent
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            // console.log(1, ethers.constants.AddressZero);
            // when user rents
            const test2Facet = await ethers.getContractAt('RentUtil', diamond.address);
            await test2Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            console.log("2")
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('1'); // RENT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            console.log("3")

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 70,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10000,
                interestRateProtocol: 10,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc721NFT.address, 70, 10000, 10);
            console.log("4")

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPool(0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(0);
            }
            console.log("5")
            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });
            console.log("6")

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPool(0);
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
            }
            console.log("7")

            ////console.log("7");
            balanceBefore = await ethers.provider.getBalance(Renter.address);

            // take loan offer
            await test1Facet.connect(Renter).processLoan(0, 0, 0, 0, { value: 1000 });
            console.log("8")
            // console.log("here")
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                console.log("8.1")
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                console.log("8.2")
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
            console.log("9")
            balanceAfter = await ethers.provider.getBalance(Renter.address);

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
                expect(assetManager.state).to.eq(rentState);

                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
                // expect(balanceAfter).gt(balanceBefore);
            }
            console.log("10")
            await time.increase(3600);

            await test2Facet.connect(deployer).expireRent(erc721NFT.address, 0, Renter.address, 0);
            console.log("11")

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            console.log("12")
            await test2Facet.connect(Renter).cancelLendToken(erc721NFT.address, 0, Renter.address, 0);
            console.log("13")

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('2'); // LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            console.log("14")

            // repay the loan
            await test1Facet.connect(Renter).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, Renter.address, 0, {
                value: 1,
            });
            console.log("15")
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Rentee.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
            console.log("16")
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('0'); // INIT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
            }
        }); //don

        it('Should revert with "InvalidInitializer" when taking a loan and already rented', async () => {
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);

                // LOAN STATE CHECKS
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(0);
            }

            // when user rents
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });
            expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('1'); // RENT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            }

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 40,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10,
                interestRateProtocol: 1,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test2Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test2Facet.connect(deployer).createLoanPool(erc721NFT.address, 40, 10, 1);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(1);
            }

            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test2Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPool(0);
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.bidderPubkey).to.eq(deployer.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);

            }

            await expect(
                test2Facet.connect(Rentee).processLoan(0, 0, 0, 0, { value: 1000 })
            ).to.be.revertedWithCustomError(test2Facet, 'InvalidInitializer');
        }); //don

        it('Should revert with "L1" when token is in STALE ', async () => {
            // token already in STALE state
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            }

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 5, // loan duration is less than rentExpiry
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10,
                interestRateProtocol: 1,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test2Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test2Facet.connect(deployer).createLoanPool(erc721NFT.address, 5, 10, 1);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(1);
            }

            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test2Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPool(0);
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.bidderPubkey).to.eq(deployer.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
            }

            await expect(
                test2Facet.connect(Renter).processLoan(0, 0, 0, 0)
            ).to.be.revertedWithCustomError(test2Facet, 'RequiredMoreThanRentValdity');

        }); //don

        it('Should revert with "RequiredValidityLessThanLoan" ', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();

            // user takes a loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }

            // approve contract
            erc721NFT.connect(LoanTaker).approve(diamond.address, 0);

            const test2Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // put up for rent
            // domint was true

            await expect(
                test2Facet.connect(LoanTaker).lendToken(
                    erc721NFT.address,
                    0, // tokenId
                    1, // ratePerMinute
                    80, // validityMinutes
                    true, //isFixed
                    10, // fixedMinutes
                    0, // privateRental
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    0
                )
            ).to.be.revertedWithCustomError(test2Facet, 'RequiredValidityLessThanLoan');

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('2'); // LOAN
                expect(assetManager.state).to.eq(rentState);
            }
        }); //don

        it('Should be able to loan and then rent a token', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(LoanProvider.address).getLoanPool(0);
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
            }

            // user takes a loan
            await erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanTaker).processLoan(0, 0, 0, 0, { value: 1000 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('2'); // LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            }

            // approve contract
            erc721NFT.connect(LoanTaker).approve(diamond.address, 0);
            const test2Facet = await ethers.getContractAt('RentUtil', diamond.address);

            // put up for rent
            // domint was true

            await test2Facet.connect(LoanTaker).lendToken(
                erc721NFT.address,
                0, // tokenId
                1, // ratePerMinute
                20, // validityMinutes
                true, //isFixed
                10, // fixedMinutes
                0, // privateRental
                '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                0
            );
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            }

            // user rents it
            await test2Facet
                .connect(acc3)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], LoanTaker.address, 0, { value: 1011 });

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
                expect(await erc721NFT.ownerOf(1)).to.equal(LoanTaker.address);
            }

            expect(await erc721NFT.ownerOf(1)).to.equal(LoanTaker.address);
            await time.increase(3600);

            // user returns it
            await test2Facet.connect(acc3).expireRent(erc721NFT.address, 0, LoanTaker.address, 0);
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
                expect(await erc721NFT.ownerOf(1)).to.equal(LoanTaker.address);
            }

            //cancel the rent
            await test2Facet.connect(LoanTaker).cancelLendToken(erc721NFT.address, 0, LoanTaker.address, 0);
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('2'); // LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            }

            // repay the loan
            await test1Facet.connect(LoanTaker).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, LoanTaker.address, 0, {
                value: ethers.utils.parseEther('1.11'),
            });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(LoanTaker).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('0'); // INIT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(LoanTaker.address);
            }
        }); //don

        it('LendToken -> Process Loan -> Process Rent -> Repay loan', async () => {
            // given for rent
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 70,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10000,
                interestRateProtocol: 10,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc721NFT.address, 70, 10000, 10);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(1);
            }

            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }

            await test1Facet.connect(Renter).processLoan(0, 0, 0, 0, { value: 1000 });
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            const test2Facet = await ethers.getContractAt('RentUtil', diamond.address);
            // when user rents
            await test2Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            await time.increase(3600);

            // repay the loan
            await test1Facet.connect(Renter).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, Renter.address, 0, {
                value: 1,
            });
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('1'); // RENT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            // user returns it
            await test2Facet.connect(deployer).expireRent(erc721NFT.address, 0, Renter.address, 0);

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            //cancel the rent
            await test2Facet.connect(Renter).cancelLendToken(erc721NFT.address, 0, Renter.address, 0);
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('0'); // INIT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
            }
        }); //don

        it('LendToken -> Process Loan -> Process Rent ->  Expire loan', async () => {
            // given for rent
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 40,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10,
                interestRateProtocol: 1,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc721NFT.address, 40, 10, 1);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(1);
            }

            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }

            // take loan offer - STALE_AND_LOAN
            await test1Facet.connect(Renter).processLoan(0, 0, 0, 0, { value: 1000 });
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }

            // when user rents
            const test2Facet = await ethers.getContractAt('RentUtil', diamond.address);
            await test2Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            await time.increase(3600);

            //expire rent
            await test2Facet.connect(Rentee).expireRent(erc721NFT.address, 0, Renter.address, 0);
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            // expire loan
            await test1Facet.connect(Rentee).expireLoan(erc721NFT.address, 0, Renter.address, 0);
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('0'); // RENT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(deployer.address);
            }
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('LendToken -> Process Loan ->  Expire rent', async () => {
            // given for rent
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 40,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10,
                interestRateProtocol: 1,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc721NFT.address, 40, 10, 1);
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(1);
            }

            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }

            // take loan offer - STALE_AND_LOAN
            await test1Facet.connect(Renter).processLoan(0, 0, 0, 0, { value: 1000 });
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }

            await time.increase(3600);

            //expire loan
            await test1Facet.connect(Rentee).expireLoan(erc721NFT.address, 0, Renter.address, 0);
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('0'); // INIT
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(deployer.address);
            }
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('LendToken -> Process Loan ->  Repay loan', async () => {
            // given for rent
            const { diamond: diamond, erc721NFT, deployer, Renter, Rentee } =
                await deployLendToken();
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);

                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }

            //create loan pool
            let param1 = {
                initializerKey: ethers.constants.AddressZero,
                tokenAddress: erc721NFT.address,
                loanDurationInMinutes: 70,
                // gracePeriodInMinutes: 30,
                apy: 10,
                interestRateLender: 10000,
                interestRateProtocol: 10,
                totalLoanOffer: 10,
                lastBidAmount: 0,
                bidNftFloorPrice: 0,
            };
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(deployer).createLoanPool(erc721NFT.address, 70, 10, 1);
            // // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(Renter.address).getLoanPoolLength();
                expect(loanPoolArray).to.eq(1);
            }

            // add loan offer
            let param2 = {
                bidderPubkey: deployer.address,
                bidAmount: ethers.utils.parseEther('1'),
                poolIndex: 0,
                totalBids: 1,
                pendingLoans: 0,
            };
            await test1Facet
                .connect(deployer)
                .addLoanOffer(1, 0, 1, { value: 1 });
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }

            // // take loan offer - STALE_AND_LOAN
            await test1Facet.connect(Renter).processLoan(0, 0, 0, 0, { value: 1000 });
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
            }

            await time.increase(3600);

            //repay loan
            await test1Facet.connect(Renter).repayLoan(erc721NFT.address, 0, ethers.constants.AddressZero, Renter.address, 0, {
                value: 1,
            });
            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                var assetManager = await Storage.connect(Renter).getAssetManager(erc721NFT.address, 0);
                const rentState = ethers.BigNumber.from('4'); // STALE
                expect(assetManager.state).to.eq(rentState);
                expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);
            }
            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanOffer = await Storage.connect(Renter.address).getLoanOffer(0, 0);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('LendTokne -> ProcessRent -> expireRent ERC11555 - doMint', async () => {
            const { diamond, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3, erc1155NFT, stream7066, streamSFT } =
                await deployDiamond();
            console.log("here")
            let rent = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };
            let loan = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };

            const doMint = true;
            const testFacet1 = await ethers.getContractAt('Stream', diamond.address)
            await testFacet1
                .connect(deployer)
                .updatePartnerConfig(erc1155NFT.address, rent, loan, doMint);


            let validity = 35;
            // approve contract
            await erc1155NFT.connect(Renter).setApprovalForAll(diamond.address, true);
            // erc1155NFT.connect
            const testFacet2 = await ethers.getContractAt('RentUtil', diamond.address)
            let txn;
            try {
                txn = await testFacet2.connect(Renter).lendToken(
                    erc1155NFT.address,
                    0, // tokenId
                    1, // ratePerMinute
                    validity, // validityMinutes
                    true, //isFixed
                    10, // fixedMinutes
                    0, // ownerShare
                    '0x0000000000000000000000000000000000000000000000000000000000000000', // merkleRoot
                    3
                );
                // //console.log("txn " + txn)
                console.log("Init rent done");
            } catch (e) {
                console.log("txn " + txn)
                console.log(e);
            }
            // this error is not handled: ERC1155: insufficient balance for transfer if 4 
            // check if the owner of the token is the contract now
            expect(await erc1155NFT.balanceOf(diamond.address, 0)).to.equal(3);

            // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            let assetManager = await Storage.connect(Rentee).getFungibleAssetManager(erc1155NFT.address, 0, Renter.address);
            console.log(assetManager)
            expect(assetManager.rentState.rentee).to.eq(Renter.address);
            let rentState = ethers.BigNumber.from('4'); // STALE
            expect(assetManager.state).to.eq(rentState);

            // rent for 10 mins
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            // function processRent(address tokenAddress, uint256 tokenId, uint256 durationMinutes, address _nftDiscount, bytes32[] calldata proof, address renter, uint256 index) external payable nonReentrant{
            console.log("here in test2")
            await test1Facet
                .connect(Rentee)
                .processRent(erc1155NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1012 });

            // STATE CHECKS
            console.log(erc1155NFT.address, 0, Renter.address, 0)
            assetManager = await Storage.connect(Rentee).getFungibleAssetManagerByIndex(erc1155NFT.address, 0, Renter.address, 0);
            console.log(assetManager)
            rentState = ethers.BigNumber.from('1'); // RENT

            await time.increase(3600);
            await test1Facet.connect(Renter).expireRent(erc1155NFT.address, 0, Renter.address, 0);

            // expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // ERC11555
            // checking token transfer
            // he should not be able to transfer
            await expect(erc1155NFT.connect(Renter).safeTransferFrom(diamond.address, acc3.address, 0, 1, '0x')).to.be.revertedWith('ERC1155: caller is not token owner or approved');
            // while expiring the token it should come back to contract

            // STATE CHECKS
            console.log(erc1155NFT.address, 0, Renter.address, 0)
            assetManager = await Storage.connect(Rentee).getFungibleAssetManagerByIndex(erc1155NFT.address, 0, Renter.address, 0);
            console.log(assetManager)
            rentState = ethers.BigNumber.from('4');
            expect(assetManager.state).to.eq(rentState);
            // expect(await erc1155NFT.balanceOf(Renter.address, 0)).to.equal(1);
        }); //don


    });

    describe('Remove Loan Offer', () => {
        it('Should revert if the user is not bidder of this offer', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await expect(
                test1Facet.connect(acc3).updateOfferCount(0, 0, 0)
            ).to.be.revertedWithCustomError(test1Facet, 'InvalidUser');

            // STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
                expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don

        it('Should remove the loan offer', async () => {
            const { diamond, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } = await deployLoanOffer();
            let beforeBalance = await ethers.provider.getBalance(
                LoanProvider.address
            );
            const test1Facet = await ethers.getContractAt('LoanUtil', diamond.address)
            await test1Facet.connect(LoanProvider).updateOfferCount(0, 0, 0);
            let afterBalance = await ethers.provider.getBalance(LoanProvider.address);
            expect(afterBalance).gt(beforeBalance);

            // LOAN STATE CHECKS
            {
                const Storage = await ethers.getContractAt('Getter', diamond.address)
                const loanPoolArray = await Storage.connect(LoanProvider).getLoanPool(0);
                const loanOffer = await Storage.connect(LoanProvider.address).getLoanOffer(0, 0);
                expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
                expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
            }
        }); //don
    });

    describe('shareReward', () => {

        it('Should be able to share reward (native token)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            // rent for 30 mins
            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            await test1Facet.connect(Rentee).shareReward(erc721NFT.address, 0, ethers.constants.AddressZero, 10, { value: 10 })

            expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should revert with InsufficientFunds (native token)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            // rent for 30 mins
            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            await expect(test1Facet.connect(Rentee).shareReward(erc721NFT.address, 0, ethers.constants.AddressZero, 2, { value: 1 })).to.be.revertedWithCustomError(test1Facet, "InsufficientFunds")

            expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

        it('Should be able to share reward (reward token)', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            // rent for 30 mins
            // approve contract
            erc721NFT.connect(Renter).approve(diamond.address, 0);
            const test1Facet = await ethers.getContractAt('RentUtil', diamond.address)
            await test1Facet
                .connect(Rentee)
                .processRent(erc721NFT.address, 0, 10, ethers.constants.AddressZero, [], Renter.address, 0, { value: 1011 });

            // reward token
            const ERC20 = await ethers.getContractFactory('MyERC20');
            let erc20 = await ERC20.deploy();
            await erc20.deployed();
            await erc20.connect(Renter).mint(Renter.address, 100);
            await erc20.connect(Renter).approve(diamond.address, 10);
            await test1Facet.connect(Renter).shareReward(erc721NFT.address, 0, erc20.address, 10, { value: 0 })
            expect(await erc721NFT.ownerOf(0)).to.equal(diamond.address);

            // // STATE CHECKS
            const Storage = await ethers.getContractAt('Getter', diamond.address)
            const assetManager = await Storage.connect(Rentee).getAssetManager(erc721NFT.address, 0);
            const rentState = ethers.BigNumber.from('1'); // RENT
            expect(assetManager.state).to.eq(rentState);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
            expect(await erc721NFT.ownerOf(0)).to.eq(diamond.address);
        }); //don

    });


    describe('discount NFT', () => {

        it('Should be able to update nft discount', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();

            const test1Facet = await ethers.getContractAt('Stream', diamond.address)
            await test1Facet
                .connect(deployer)
                .updateNFTDiscount(erc721NFT.address, 10, 10);
        }); //done
    })

    describe('updatePartnerConfig', () => {
        it('Should be able to update PartnerConfig ', async () => {
            const { diamond,
                deployer,
                Renter,
                Rentee,
                acc3,
                erc721NFT,
                erc7066NFT,
                erc1155NFT } =
                await deployLendToken();
            let rent = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };
            let loan = {
                wallet: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
                fee: 10000,
                token: ethers.constants.AddressZero,
            };
            const doMint = false;
            const test1Facet = await ethers.getContractAt('Stream', diamond.address)
            await test1Facet
                .connect(deployer)
                .updatePartnerConfig(erc721NFT.address, rent, loan, doMint);
        }); //done
    })

    describe('ERC7066SFT', () => {
        it('Should be able to transfer and lock', async () => {
            const [deployer, sender, receiver, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(sender.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(sender.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(sender).transferAndLock(sender.address, receiver.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(sender.address, 1));
            console.log(await streamSFT.balanceOf(receiver.address, 1));

        });

        it('Sender should be able to withdraw locked tokens', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            await streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 4, "0x");

        });

        it('Receiver should not be able to transfer locked tokens', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));
            await expect(streamSFT.connect(user2).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")).to.be.revertedWith("ERC7066: Can't Spend Locked");

        });

        it('Sender should be able to withdraw locked tokens sequentially', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            await streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 4, "0x");
            console.log(await streamSFT.balanceOf(user1.address, 1));
            await streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 3, "0x");
            console.log(await streamSFT.balanceOf(user1.address, 1));

        });

        it('Sender should not be able to withdraw more then the locked tokens', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            await expect(streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 8, "0x")).to.be.revertedWith("ERC1155: caller is not token owner or approved");
            console.log(await streamSFT.balanceOf(user1.address, 1));
        });

        it('Sender should not be able to withdraw more then the locked tokens sequentially', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            await streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 5, "0x");
            console.log(await streamSFT.balanceOf(user1.address, 1));
            await expect(streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 5, "0x")).to.be.revertedWith("ERC1155: caller is not token owner or approved");
            console.log(await streamSFT.balanceOf(user1.address, 1));
        });

        it('Sender should not be able to transfer if token is locked', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));
            await expect(streamSFT.connect(user2).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")).to.be.revertedWith("ERC7066: Can't Spend Locked");
        });

        it('User3 should not be able to transfer if token is locked', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));
            await expect(streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")).to.be.revertedWith("ERC1155: caller is not token owner or approved");
        });

        it('Sender should be able to unlock token', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function unlock(uint256 tokenId, address account, uint256 amount)
            await streamSFT.connect(user1).unlock(1, user2.address, 5);
        });

        it('Receiver should be able to transfer token if it is unlocked', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function unlock(uint256 tokenId, address account, uint256 amount)
            await streamSFT.connect(user1).unlock(1, user2.address, 5);

            await streamSFT.connect(user2).safeTransferFrom(user2.address, user1.address, 1, 4, "0x");
            // await streamSFT.connect(user2).safeTransferFrom(user2.address, user3.address, 1, 5, "0x");

        });

        it('Receiver should not be able to transfer token more than the unlocked', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function unlock(uint256 tokenId, address account, uint256 amount)
            await streamSFT.connect(user1).unlock(1, user2.address, 5);

            // await streamSFT.connect(user1).safeTransferFrom(user2.address, user1.address, 1, 4, "0x");
            await expect(streamSFT.connect(user2).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")).to.be.revertedWith("ERC7066: Can't Spend Locked");

        });

        it('Receiver should be able to transfer unlocked tokens sequentially', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function unlock(uint256 tokenId, address account, uint256 amount)
            await streamSFT.connect(user1).unlock(1, user2.address, 5);

            await streamSFT.connect(user2).safeTransferFrom(user2.address, user1.address, 1, 4, "0x");
            await streamSFT.connect(user2).safeTransferFrom(user2.address, user1.address, 1, 1, "0x");
        });

        it('User3 should be able to transfer if token is unlocked and approved', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function setApprovalForId(uint256 tokenId, address operator, uint256 amount) 
            await streamSFT.connect(user2).setApprovalForId(1, user3.address, 7);

            //unlock
            await streamSFT.connect(user1).unlock(1, user2.address, 7);

            await streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")
            // await expect(streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")).to.be.revertedWith("ERC1155: caller is not token owner or approved");
        });

        it('User3 should be able to transfer if token is unlocked and approved', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function setApprovalForId(uint256 tokenId, address operator, uint256 amount) 
            await streamSFT.connect(user2).setApprovalForId(1, user3.address, 6);

            //unlock
            await streamSFT.connect(user1).unlock(1, user2.address, 7);

            await streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")
            // await expect(streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 7, "0x")).to.be.revertedWith("ERC1155: caller is not token owner or approved");
        });

        it('User3 should not be able to transfer more than the token unlocked and approved', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));


            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // function setApprovalForId(uint256 tokenId, address operator, uint256 amount) 
            await streamSFT.connect(user2).setApprovalForId(1, user3.address, 6);

            //unlock
            await streamSFT.connect(user1).unlock(1, user2.address, 7);

            // await streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 6, "0x")
            await expect(streamSFT.connect(user3).safeTransferFrom(user2.address, user3.address, 1, 7, "0x")).to.be.revertedWith("ERC1155: caller is not token owner or approved");
        });

        // both sender and receiver has token
        it('Sender should be able to transfer locked tokens to receiver', async () => {
            const [deployer, user1, user2, user3] = await ethers.getSigners();
            // deploy streamSFT
            const StreamSFT = await ethers.getContractFactory('StreamSFT')
            const streamSFT = await StreamSFT.deploy(deployer.address)
            await streamSFT.deployed()
            console.log('StreamSFT deployed:', streamSFT.address)

            // function updateOwner(address _owner)
            await streamSFT.connect(deployer).updateOwner(deployer.address);

            // function mint(address to, string memory uri, uint256 amount) 
            await streamSFT.connect(deployer).mint(user1.address, "hello", 7);
            uri = await streamSFT.tokenURI(1);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user1.address, 1));

            await streamSFT.connect(deployer).mint(user2.address, "hello", 5);
            uri = await streamSFT.tokenURI(2);
            console.log("uri: ", uri);
            console.log(await streamSFT.balanceOf(user2.address, 2));

            // function transferAndLock(address from, address to, uint256 tokenId, uint256 amount, bool setApprove)
            await streamSFT.connect(user1).transferAndLock(user1.address, user2.address, 1, 7, true);
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));

            // unlock
            await streamSFT.connect(user1).unlock(1, user2.address, 7);

            await streamSFT.connect(user2).safeTransferFrom(user2.address, user2.address, 1, 7, "0x");
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));
            await streamSFT.connect(user2).safeTransferFrom(user2.address, user2.address, 1, 5, "0x");
            console.log(await streamSFT.balanceOf(user1.address, 1));
            console.log(await streamSFT.balanceOf(user2.address, 1));
            // console.log(await streamSFT.balanceOf(user1.address, 1));
            // console.log(await streamSFT.balanceOf(user2.address, 1));
        });


    })
})