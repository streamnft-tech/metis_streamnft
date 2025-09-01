// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const { MerkleTree } = require('merkletreejs');
// const {
//     time,
//     impersonateAccount,
// } = require('@nomicfoundation/hardhat-network-helpers');

// describe('wStream', () => {
//     async function deployWStream() {
//         const [deployer, Renter, Rentee, acc3] = await ethers.getSigners();
//         // const MerkleUtil = await ethers.getContractFactory('MerkleUtil');
//         // const merkleUtil = await MerkleUtil.deploy();

//         const WStream = await ethers.getContractFactory('WStream');
//         let wStream = await WStream.deploy();
//         await wStream.deployed();

//         // deploy common ERC721 NFT and mint an NFT
//         const ERC721NFT = await ethers.getContractFactory('CommonNFT');
//         let erc721NFT = await ERC721NFT.deploy();
//         await erc721NFT.deployed();
//         await erc721NFT.connect(Renter).mint(Renter.address);

//         //deploy ERC 7066 NFT and mint an NFT
//         const ERC7066NFT = await ethers.getContractFactory('ERC7066NFT');
//         let erc7066NFT = await ERC7066NFT.deploy();
//         await erc7066NFT.deployed();
//         await erc7066NFT.connect(Renter).mint(Renter.address);

//         //deploy ERC1155 NFT and mint an NFT
//         const ERC1155NFT = await ethers.getContractFactory('ERC1155Nft');
//         let erc1155NFT = await ERC1155NFT.deploy();
//         await erc1155NFT.deployed();
//         await erc1155NFT.connect(Renter).mint(Renter.address, 1);

//         return {
//             wStream,
//             deployer,
//             Renter,
//             Rentee,
//             acc3,
//             erc721NFT,
//             erc7066NFT,
//             erc1155NFT,
//         };
//     }

//     async function deployLendToken(validity) {
//         const { wStream, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3 } =
//             await deployWStream();
//         validity = validity || 35;
//         // approve contract
//         erc721NFT.connect(Renter).approve(wStream.address, 0);

//         // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//         await wStream.connect(Renter).lendToken(
//             erc721NFT.address,
//             0, // tokenId
//             1, // ratePerMinute
//             validity, // validityMinutes
//             true, //isFixed
//             10, // fixedMinutes
//             true, // isMint
//             false, // privateRental
//             '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//         );
//         return { wStream, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT };
//     }

//     async function deployLendTokenNoMint() {
//         const { wStream, erc721NFT, erc7066NFT, deployer, Renter, Rentee, acc3 } =
//             await deployWStream();

//         // approve contract
//         erc721NFT.connect(Renter).approve(wStream.address, 0);

//         // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//         await wStream.connect(Renter).lendToken(
//             erc721NFT.address,
//             0, // tokenId
//             1, // ratePerMinute
//             35, // validityMinutes
//             true, //isFixed
//             10, // fixedMinutes
//             true, // isMint
//             false, // privateRental
//             '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//         );
//         return { wStream, deployer, Renter, Rentee, acc3, erc721NFT, erc7066NFT };
//     }

//     async function deployLoanPool() {
//         const [deployer, LoanProvider, LoanTaker, acc3] = await ethers.getSigners();

//         const MerkleUtil = await ethers.getContractFactory('MerkleUtil');
//         const merkleUtil = await MerkleUtil.deploy();

//         const WStream = await ethers.getContractFactory('WStream');
//         let wStream = await WStream.deploy();
//         await wStream.deployed();

//         // deploy common ERC721 NFT and mint an NFT
//         const ERC721NFT = await ethers.getContractFactory('CommonNFT');
//         let erc721NFT = await ERC721NFT.deploy();
//         await erc721NFT.deployed();
//         await erc721NFT.connect(LoanTaker).mint(LoanTaker.address);
//         await erc721NFT.connect(acc3).mint(acc3.address);

//         let param = {
//             initializerKey: ethers.constants.AddressZero,
//             tokenAddress: erc721NFT.address,
//             loanDurationInMinutes: 70,
//             // gracePeriodInMinutes: 30,
//             apy: 10,
//             interestRateLender: 10000,
//             interestRateProtocol: 10,
//             totalLoanOffer: 10,
//             lastBidAmount: 0,
//             bidNftFloorPrice: 0,
//         };
//         await wStream.connect(deployer).createLoanPool(param);
//         let loanPoolArray = await wStream.getLoanPool();
//         expect(loanPoolArray.length).to.eq(1);

//         return { wStream, deployer, LoanProvider, LoanTaker, acc3, erc721NFT };
//     }

//     async function deployLoanOffer() {
//         const { wStream, deployer, LoanProvider, LoanTaker, acc3, erc721NFT } =
//             await deployLoanPool();

//         let param = {
//             bidderPubkey: LoanProvider.address,
//             bidAmount: ethers.utils.parseEther('1'),
//             LoanPoolIndex: 0,
//             totalBids: 1,
//             pendingLoans: 0,
//         };
//         await wStream
//             .connect(LoanProvider)
//             .addLoanOffer(param, { value: ethers.utils.parseEther('1') });
//         return { wStream, deployer, LoanProvider, LoanTaker, acc3, erc721NFT };
//     }

//     describe('lendToken', () => {
//         it('Should revert with Invalid Initialiser', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await expect(
//                 wStream.connect(Rentee).lendToken(
//                     erc721NFT.address,
//                     0, // tokenId
//                     1, // ratePerMinute
//                     35, // validityMinutes
//                     true, //isFixed
//                     30, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream, `InvalidInitializer`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(Renter.address);

//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);

//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should revert as msg.sender is not token owner', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await expect(
//                 wStream.connect(Rentee).lendToken(
//                     erc721NFT.address,
//                     0, // tokenId
//                     1, // ratePerMinute
//                     35, // validityMinutes
//                     true, //isFixed
//                     30, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream, `InvalidUser`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(ethers.constants.AddressZero);

//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);

//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//         });

//         it('Should revert with "R1" ', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent it
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });
//             // try to put for rent again
//             await expect(
//                 wStream.connect(Renter).lendToken(
//                     erc721NFT.address,
//                     0, // tokenId
//                     1, // ratePerMinute
//                     35, // validityMinutes
//                     true, //isFixed
//                     30, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream,`AlreadyOnRent`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(Renter.address);

//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);

//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         // TODO : fix this
//         // it('Should revert with custom error "InvalidTokenType" ', async () => {
//         // 	const { wStream, Renter } = await deployWStream();

//         // 	// address, tokenId,ratePerMinute,validityMinutes,isFixed,
//         // 	expect(
//         // 		await wStream.connect(Renter).lendToken(
//         // 			Renter.address,
//         // 			0, // tokenId
//         // 			1, // ratePerMinute
//         // 			35, // validityMinutes
//         // 			true, //isFixed
//         // 			30, // fixedMinutes
//         // 			90, // ownerShar
//         // 			ethers.constants.AddressZero // whitelist
//         // 		)
//         // 	).to.be.revertedWithCustomError(wStream, `InvalidTokenType`);
//         // });

//         it('Should revert with InvalidTimeDuration - test 1', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // validity minutes < Fixed minutes
//             await expect(
//                 wStream.connect(Renter).lendToken(
//                     erc721NFT.address, // tokenAddress
//                     0, // tokenId
//                     1, // ratePerMinute
//                     25, // validityMinutes
//                     true, //isFixed
//                     30, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream, `InvalidTimeDuration`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(ethers.constants.AddressZero);

//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);

//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//         });

//         it('Should revert with InvalidTimeDuration - test 2', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // Fixed minutes < minimum rent minutes
//             await expect(
//                 wStream.connect(Renter).lendToken(
//                     erc721NFT.address, // tokenAddress
//                     0, // tokenId
//                     1, // ratePerMinute
//                     25, // validityMinutes
//                     true, //isFixed
//                     0, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream, `InvalidTimeDuration`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(ethers.constants.AddressZero);

//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);

//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//         });

//         it('Should revert with InvalidTimeDuration - test 3', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // Not fixed, validity minutes < minimum rent duration
//             await expect(
//                 wStream.connect(Renter).lendToken(
//                     erc721NFT.address, // tokenAddress
//                     0, // tokenId
//                     1, // ratePerMinute
//                     0, // validityMinutes
//                     false, //isFixed
//                     0, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream, `InvalidTimeDuration`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(ethers.constants.AddressZero);

//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);

//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//         });

//         it.only('Should be able to lend an NFT (ERC721)', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await wStream.connect(Renter).lendToken(
//                 erc721NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );

//             // check if the owner of the token is the contract now(both minted and original NFT)
//             expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             let tokenId = 1;
//             expect(await wStream.tokenURI(tokenId)).to.equal(`hiii${tokenId - 1}`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(Renter.address);

//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//         });

//         it('Should be able to lend an NFT (ERC7066)', async () => {
//             const { wStream, erc7066NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc7066NFT.connect(Renter).approve(wStream.address, 0);

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await wStream.connect(Renter).lendToken(
//                 erc7066NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );

//             // check if the owner of the token is the contract now
//             expect(await erc7066NFT.ownerOf(0)).to.equal(wStream.address);
//             // check if new ERC7066 is not minted
//             expect(await wStream.totalSupply()).to.be.equal(1);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc7066NFT.address, 0);
//             expect(assetManager[0]).to.eq(Renter.address);

//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//         });

//         it('Should be able to lend an NFT (ERC1155)', async () => {
//             const { wStream, erc1155NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc1155NFT.connect(Renter).setApprovalForAll(wStream.address, true);

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await wStream.connect(Renter).lendToken(
//                 erc1155NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );

//             // check if the owner of the token is the contract now
//             expect(await erc1155NFT.balanceOf(wStream.address, 0)).to.equal(1);
//             expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             let tokenId = 1;
//             expect(await wStream.tokenURI(tokenId)).to.equal(`hiii`);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc1155NFT.address, 0);
//             expect(assetManager[0]).to.eq(Renter.address);

//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//         });

//         it('Should be able to lend an NFT(ERC721) - without new mint', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await wStream.connect(Renter).lendToken(
//                 erc721NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 false, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );

//             // check if the owner of the token is the contract now
//             expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[0]).to.eq(Renter.address);

//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//         });
//     });

//     describe('processRent', () => {
//         it('Should revert with Insufficient funds', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent for 30 mins
//             await expect(
//                 wStream.connect(Rentee).processRent(erc721NFT.address, 0, 30, [])
//             ).to.be.revertedWithCustomError(wStream, 'InsufficientFunds');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should revert with requested time more than validity time', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent for 30 mins but validity time is 35 mins
//             await expect(
//                 wStream.connect(Rentee).processRent(erc721NFT.address, 0, 40, [])
//             ).to.be.revertedWithCustomError(wStream, 'ExceededValidity');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should revert with "Already rented" ', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             await expect(
//                 wStream
//                     .connect(deployer)
//                     .processRent(erc721NFT.address, 0, 30, [], { value: 33 })
//             ).to.be.revertedWithCustomError(wStream,'InvalidAssetState');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(Rentee.address);
//         });

//         it('Should revert with "Private Rental" ', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee, acc3 } =
//                 await deployWStream();
//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // merkle tree
//             let balances = [
//                 {
//                     addr: '0xb7e390864a90b7b923c9f9310c6f98aafe43f707'
//                 },
//                 {
//                     addr: '0xea674fdde714fd979de3edf0f56aa9716b898ec8'
//                 },
//                 {
//                     addr: '0xea674fdde714fd979de3edf0f56aa9546b898ec8'
//                 },
//                 {
//                     addr: '0xea674fdde714fd979de3edf0f56aa8916b898ec8'
//                 }
//             ];
//             const leafNodes = balances.map((balance) =>
//                 ethers.utils.keccak256(Buffer.from(balance.addr.replace('0x', ''), 'hex'))
//             );
//             const merkleTree = new MerkleTree(leafNodes, ethers.utils.keccak256, {
//                 sortPairs: true,
//             });
//             // lend token for rent

//             const temp = await wStream.connect(Renter).lendToken(
//                 erc721NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 //TODO : fix this
//                 true, //privateRental
//                 merkleTree.getHexRoot() // merkleRoot
//             );
//             await expect(
//                 wStream
//                     .connect(deployer)
//                     .processRent(erc721NFT.address, 0, 30, [], { value: 33 })
//             ).to.be.revertedWithCustomError(wStream, 'PrivateRental');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should pass for "Private Rental" ', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee, acc3 } =
//                 await deployWStream();
//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // merkle tree
//             let balances = [
//                 {
//                     addr: Rentee.address
//                 },
//                 {
//                     addr: '0xea674fdde714fd979de3edf0f56aa9716b898ec8'
//                 },
//                 {
//                     addr: '0xea674fdde714fd979de3edf0f56aa9546b898ec8'
//                 },
//                 {
//                     addr: '0xea674fdde714fd979de3edf0f56aa8916b898ec8'
//                 }
//             ];
//             const leafNodes = balances.map((balance) =>
//                 ethers.utils.keccak256(Buffer.from(balance.addr.replace('0x', ''), 'hex'))
//             );
//             const merkleTree = new MerkleTree(leafNodes, ethers.utils.keccak256, {
//                 sortPairs: true,
//             });
//             // lend token for rent

//             await wStream.connect(Renter).lendToken(
//                 erc721NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 //TODO : fix this
//                 true, //privateRental
//                 merkleTree.getHexRoot() // merkleRoot
//             );
//             await wStream
//                     .connect(Rentee)
//                     .processRent(erc721NFT.address, 0, 30, merkleTree.getHexProof(leafNodes[0]), { value: 33 });

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(assetManager[5][6]).to.eq(Rentee.address);
//         });

//         it('Should be able to rent an NFT - ERC721', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             expect(await wStream.lockerOf(1)).to.equal(wStream.address);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(Rentee.address);
//         });

//         it('Should be able to rent to whitelisted account', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployWStream();
//             // approve contract
//             erc721NFT.connect(Renter).approve(wStream.address, 0);

//             // lend token for rent
//             await wStream.connect(Renter).lendToken(
//                 erc721NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 //TODO : fix below
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );

//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(Rentee.address);
//         });

//         it('Should be able to rent an NFT with protocol fee', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken(250);

//             // use enum the right way :
//             const rentState = ethers.BigNumber.from('1');
//             let feeStruct = {
//                 treasury: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
//                 value: 10000,
//             };

//             //impersonate admin
//             const adminAddress = '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd';
//             await impersonateAccount(adminAddress);
//             const adminWallet = await ethers.getSigner(adminAddress);

//             // fund admin wallet
//             await network.provider.send('hardhat_setBalance', [
//                 '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd',
//                 '0x142FE442092FD00',
//             ]);

//             // fund rentee wallet
//             await network.provider.send('hardhat_setBalance', [
//                 Rentee.address,
//                 '0x142FE442092FD00',
//             ]);

//             await wStream
//                 .connect(adminWallet)
//                 .updateProtocolFee(erc721NFT.address, rentState, feeStruct);

//             const balanceBefore = await ethers.provider.getBalance(
//                 feeStruct.treasury
//             );

//             // rent for 200 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 200, [], { value: 240 });

//             const balanceAfter = await ethers.provider.getBalance(
//                 feeStruct.treasury
//             );
//             expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             expect(await wStream.lockerOf(1)).to.equal(wStream.address);
//             expect(balanceAfter.gt(balanceBefore)).to.be.true;

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(Rentee.address);
//         });

//         it('Should be able to rent an NFT - ERC7066', async () => {
//             const { wStream, erc7066NFT, deployer, Renter, Rentee } =
//                 await deployWStream();

//             // approve contract
//             erc7066NFT.connect(Renter).approve(wStream.address, 0);

//             // give out for rent
//             await wStream.connect(Renter).lendToken(
//                 erc7066NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );

//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc7066NFT.address, 0, 30, [], { value: 33 });

//             expect(await erc7066NFT.ownerOf(0)).to.equal(Rentee.address);
//             expect(await wStream.totalSupply()).to.equal(1);
//             expect(await erc7066NFT.lockerOf(0)).to.equal(wStream.address);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc7066NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//         });

//         it('Should be able to rent an NFT - without new mint', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendTokenNoMint();
//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             expect(await wStream.ownerOf(1)).to.equal(Rentee.address);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });
//     });

//     describe('expireRent', () => {
//         it('Should revert with "Not in rented state" ', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             await expect(
//                 wStream.connect(deployer).expireRent(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream,'InvalidAssetState');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should revert with "R4" ', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             await expect(
//                 wStream.connect(deployer).expireRent(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream,'PendingExpiry');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(Rentee.address);
//         });

//         it('Should be able to expireRent', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendToken();
//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             // go forward in time
//             await time.increase(3600);

//             await wStream.connect(deployer).expireRent(erc721NFT.address, 0);
//             expect(await wStream.ownerOf(1)).to.be.equal(wStream.address);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(wStream.address);
//         });

//         it('Should be able to expire rent - without mint', async () => {
//             const { wStream, erc721NFT, deployer, Renter, Rentee } =
//                 await deployLendTokenNoMint();
//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             // go forward in time
//             await time.increase(3600);

//             await wStream.connect(deployer).expireRent(erc721NFT.address, 0);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(assetManager.rentState.rentee).to.eq(ethers.constants.AddressZero);
//         });
//     });

//     describe('cancelLendToken', () => {
//         it('Should revert with "R5" ', async () => {
//             const { wStream, erc721NFT, Rentee } = await deployLendToken();

//             await expect(
//                 wStream.connect(Rentee).cancelLendToken(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream,'InvalidUser');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('4'); // STALE
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should revert with "Asset is Rented Out" ', async () => {
//             const { wStream, erc721NFT, Renter, Rentee } = await deployLendToken();

//             // rent for 30 mins
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 30, [], { value: 33 });

//             await expect(
//                 wStream.connect(Renter).cancelLendToken(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream,'AlreadyRentedOut');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('1'); // RENT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             expect(await wStream.ownerOf(1)).to.eq(Rentee.address);
//         });

//         it('Should cancelLendToken (ERC721)', async () => {
//             const { wStream, erc721NFT, Renter } = await deployLendToken();
//             await wStream.connect(Renter).cancelLendToken(erc721NFT.address, 0);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//             expect(await wStream.ownerOf(1)).to.eq(wStream.address);
//         });

//         it('Should cancelLendToken (ERC7066)', async () => {
//             const { wStream, erc7066NFT, Renter } = await deployWStream();

//             // approve contract
//             erc7066NFT.connect(Renter).approve(wStream.address, 0);

//             // address, tokenId,ratePerMinute,validityMinutes,isFixed,
//             await wStream.connect(Renter).lendToken(
//                 erc7066NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 35, // validityMinutes
//                 true, //isFixed
//                 30, // fixedMinutes
//                 true, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );
//             await wStream.connect(Renter).cancelLendToken(erc7066NFT.address, 0);

//             expect(await erc7066NFT.ownerOf(0)).to.be.equal(Renter.address);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc7066NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//         });

//         it('Should cancelLendToken(ERC721) - without mint', async () => {
//             const { wStream, erc721NFT, Renter } = await deployLendTokenNoMint();
//             await wStream.connect(Renter).cancelLendToken(erc721NFT.address, 0);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//         });
//     });

//     describe('Add loan offer', () => {
//         it('Should revert with "Insufficient Funds: ', async () => {
//             const { wStream, erc721NFT, LoanProvider, LoanTaker } =
//                 await deployLoanPool();
//             let param = {
//                 bidderPubkey: LoanProvider.address,
//                 bidAmount: 1,
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await expect(
//                 wStream.connect(LoanProvider).addLoanOffer(param)
//             ).to.be.revertedWithCustomError(wStream, 'InsufficientFunds');

//             let loanPoolArray = await wStream.getLoanPool();
//             expect(loanPoolArray.length).to.eq(1);
//         });

//         it('Should create a loan offer', async () => {
//             const { wStream, erc721NFT, LoanProvider, LoanTaker } =
//                 await deployLoanPool();
//             let param = {
//                 bidderPubkey: LoanProvider.address,
//                 bidAmount: 1,
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream.connect(LoanProvider).addLoanOffer(param, { value: 1 });

//             // STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
//             }
//         });
//     });

//     describe('Process Loan', () => {
//         it('Should revert with "Not Up For Loan" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3 } = await deployLoanOffer();
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             await expect(
//                 wStream.connect(acc3).processLoan(0, 0, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidAssetState');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('2'); // LOAN
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//         });

//         it('Should revert with "Invalid User" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3 } = await deployLoanOffer();
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);

//             await expect(
//                 wStream.connect(acc3).processLoan(0, 0, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidUser');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);
//         });

//         it('Should revert with "L2" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, LoanProvider, acc3 } =
//                 await deployLoanOffer();

//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             await erc721NFT.connect(acc3).approve(wStream.address, 1);
//             await expect(
//                 wStream.connect(acc3).processLoan(0, 0, 1)
//             ).to.be.revertedWithCustomError(wStream,'AllOffersTaken');
//         });

//         it('Should Process the loan for loan taker', async () => {
//             const { wStream, erc721NFT, LoanTaker, LoanProvider } =
//                 await deployLoanOffer();
//             balanceBefore = await ethers.provider.getBalance(LoanTaker.address);

//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             balanceAfter = await ethers.provider.getBalance(LoanTaker.address);

//             expect(balanceAfter).gt(balanceBefore);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('2'); // LOAN
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);

//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }
//         });
//     });

//     describe('Repay Loan', () => {
//         it('should revert with "Invalid User" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3 } = await deployLoanOffer();

//             // take loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // repay loan by another person
//             await expect(
//                 wStream.connect(acc3).repayLoan(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidUser');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('2'); // LOAN
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }
//         });

//         it('Should revert with "Insufficient Funds" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3 } = await deployLoanOffer();

//             // take loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // repay loan
//             await expect(
//                 wStream.connect(LoanTaker).repayLoan(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InsufficientFunds');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('2'); // LOAN
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }
//         });

//         it('Should revert with "NotUpForLoan" ', async () => {
//             const { wStream, LoanTaker, erc721NFT } = await deployLoanOffer();

//             await expect(
//                 wStream.connect(LoanTaker).repayLoan(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidAssetState');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });

//         it('Should repay loan', async () => {
//             const { wStream, erc721NFT, LoanTaker, LoanProvider } =
//                 await deployLoanOffer();

//             // take loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             // repay loan
//             await wStream.connect(LoanTaker).repayLoan(erc721NFT.address, 0, {
//                 value: ethers.utils.parseEther('1.11'),
//             });
//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(LoanTaker.address);

//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });
//     });

//     describe('Expire Loan', () => {
//         it('Should revert with "Loan not expired yet" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3 } = await deployLoanOffer();

//             // take loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // expire loan
//             await expect(
//                 wStream.connect(acc3).expireLoan(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream,'PendingExpiry');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('2'); // LOAN
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }
//         });

//         it('Should revert with "InvalidStateForExpiry" ', async () => {
//             const { wStream, deployer, erc721NFT, Renter } = await deployWStream();
//             await expect(
//                 wStream.connect(deployer).expireLoan(erc721NFT.address, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidAssetState');

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.eq(Renter.address);
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(0);
//             }
//         });

//         it('Should expire the loan ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3, LoanProvider } =
//                 await deployLoanOffer();

//             // take loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // move to 70 later
//             await time.increase(4200);

//             // expire loan
//             await wStream.connect(acc3).expireLoan(erc721NFT.address, 0);

//             // STATE CHECKS
//             const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//             const rentState = ethers.BigNumber.from('0'); // INIT
//             expect(assetManager[3]).to.eq(rentState);
//             expect(await erc721NFT.ownerOf(0)).to.be.equal(LoanProvider.address);

//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });
//     });

//     describe('Remove Loan Offer', () => {
//         it('Should revert if the user is not bidder of this offer', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3, LoanProvider } =
//                 await deployLoanOffer();

//             await expect(
//                 wStream.connect(acc3).removeLoanOffer(0, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidUser');

//             // STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.bidderPubkey).to.eq(LoanProvider.address);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });

//         it('Should remove the loan offer', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3, LoanProvider } =
//                 await deployLoanOffer();

//             let beforeBalance = await ethers.provider.getBalance(
//                 LoanProvider.address
//             );
//             await wStream.connect(LoanProvider).removeLoanOffer(0, 0);
//             let afterBalance = await ethers.provider.getBalance(LoanProvider.address);
//             expect(afterBalance).gt(beforeBalance);

//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });
//     });

//     describe('Utility functions', () => {
//         it('Should not Update discount', async () => {
//             const { wStream, deployer, erc721NFT } = await deployWStream();
//             // use enum the right way :
//             const rentState = ethers.BigNumber.from('1');
//             await expect(
//                 wStream
//                     .connect(deployer)
//                     .updateDiscount(erc721NFT.address, rentState, 5)
//             ).to.be.revertedWith('E3');
//         });

//         it('Should be able to update discount', async () => {
//             const { wStream, erc721NFT, deployer } = await deployWStream();
//             // use enum the right way :
//             const rentState = ethers.BigNumber.from('1');

//             //impersonate admin
//             const adminAddress = '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd';
//             await impersonateAccount(adminAddress);
//             const adminWallet = await ethers.getSigner(adminAddress);

//             // fund admin wallet
//             await network.provider.send('hardhat_setBalance', [
//                 '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd',
//                 '0x142FE442092FD00',
//             ]);

//             await wStream
//                 .connect(adminWallet)
//                 .updateDiscount(erc721NFT.address, rentState, 5);
//         });

//         it('Should not Update protocol fee', async () => {
//             const { wStream, deployer, erc721NFT } = await deployWStream();
//             // use enum the right way :
//             const rentState = ethers.BigNumber.from('1');
//             let feeStruct = {
//                 treasury: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
//                 value: 5,
//             };
//             await expect(
//                 wStream
//                     .connect(deployer)
//                     .updateProtocolFee(erc721NFT.address, rentState, feeStruct)
//             ).to.be.revertedWith('E3');
//         });

//         it('Should be able to update protocol fee', async () => {
//             const { wStream, erc721NFT, deployer } = await deployWStream();
//             // use enum the right way :
//             const rentState = ethers.BigNumber.from('1');
//             let feeStruct = {
//                 treasury: '0xfb18e6ff5f94bdf0115ed4c61f9cf49041245ded',
//                 value: 5,
//             };

//             //impersonate admin
//             const adminAddress = '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd';
//             await impersonateAccount(adminAddress);
//             const adminWallet = await ethers.getSigner(adminAddress);

//             // fund admin wallet
//             await network.provider.send('hardhat_setBalance', [
//                 '0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd',
//                 '0x142FE442092FD00',
//             ]);

//             await wStream
//                 .connect(adminWallet)
//                 .updateProtocolFee(erc721NFT.address, rentState, feeStruct);
//         });

//         it('Should test for supportInterface', async () => {
//             const { wStream, deployer, erc721NFT } = await deployWStream();
//             //interface id for erc721
//             const interfaceId = '0x80ac58cd';

//             expect(await wStream.supportsInterface(interfaceId)).to.be.true;
//         });

//         it('Should test the fallback function ', async () => {
//             const { wStream, deployer } = await deployWStream();

//             const amount = ethers.utils.parseEther('1.0');

//             // Send Ether to the contract's fallback function
//             await deployer.sendTransaction({
//                 to: wStream.address,
//                 value: amount,
//             });

//             // Check the contract's balance
//             const contractBalance = await ethers.provider.getBalance(wStream.address);
//             expect(contractBalance).to.equal(amount);
//         });
//     });

//     /////////////////////////
//     /// INTEGRATION TESTS ///
//     /////////////////////////

//     describe('Integration tests', () => {
//         it('Should revert with "InvalidInitializer" when taking a loan and already rented', async () => {
//             const { wStream, Rentee, erc721NFT, Renter, deployer, acc3 } =
//                 await deployLendToken();

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//                 // LOAN STATE CHECKS
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(0);
//             }

//             // when user rents
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 10, [], { value: 11 });
//             expect(await wStream.ownerOf(1)).to.equal(Rentee.address);

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('1'); // RENT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 40,
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10,
//                 interestRateProtocol: 1,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);

//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });

//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.bidderPubkey).to.eq(deployer.address);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             await expect(
//                 wStream.connect(acc3).processLoan(0, 0, 0)
//             ).to.be.revertedWithCustomError(wStream, 'InvalidInitializer');
//         });

//         it('Should revert with "L1" when token is in STALE ', async () => {
//             // token already in STALE state
//             const { wStream, Rentee, erc721NFT, Renter, deployer } =
//                 await deployLendToken();

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 5, // loan duration is less than rentExpiry
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10,
//                 interestRateProtocol: 1,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);

//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.bidderPubkey).to.eq(deployer.address);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             await expect(
//                 wStream.connect(Renter).processLoan(0, 0, 0)
//             ).to.be.revertedWithCustomError(wStream,'RequiredMoreThanRentValdity');
//         });

//         it('Should revert with "RequiredValidityLessThanLoan" ', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3, LoanProvider } =
//                 await deployLoanOffer();

//             // user takes a loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             // approve contract
//             erc721NFT.connect(LoanTaker).approve(wStream.address, 0);

//             // put up for rent
//             await expect(
//                 wStream.connect(LoanTaker).lendToken(
//                     erc721NFT.address,
//                     0, // tokenId
//                     1, // ratePerMinute
//                     80, // validityMinutes
//                     true, //isFixed
//                     10, // fixedMinutes
//                     true, // isMint
//                     false, // privateRental
//                     '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//                 )
//             ).to.be.revertedWithCustomError(wStream, 'RequiredValidityLessThanLoan');

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('2'); // LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//             }
//         });

//         it('Should be able to loan and then rent a token', async () => {
//             const { wStream, erc721NFT, LoanTaker, acc3 } = await deployLoanOffer();
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             // user takes a loan
//             await erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             await wStream.connect(LoanTaker).processLoan(0, 0, 0);

//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('2'); // LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             }

//             // approve contract
//             erc721NFT.connect(LoanTaker).approve(wStream.address, 0);
//             // put up for rent
//             await wStream.connect(LoanTaker).lendToken(
//                 erc721NFT.address,
//                 0, // tokenId
//                 1, // ratePerMinute
//                 20, // validityMinutes
//                 true, //isFixed
//                 10, // fixedMinutes
//                 true, // isMint
//                 false, // privateRental
//                 '0x0000000000000000000000000000000000000000000000000000000000000000' // merkleRoot
//             );
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             }

//             // user rents it
//             await wStream
//                 .connect(acc3)
//                 .processRent(erc721NFT.address, 0, 10, [], { value: 11 });

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(acc3.address);
//             }

//             expect(await wStream.ownerOf(1)).to.equal(acc3.address);
//             expect(await wStream.lockerOf(1)).to.equal(wStream.address);

//             await time.increase(3600);

//             // user returns it
//             await wStream.connect(acc3).expireRent(erc721NFT.address, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             }

//             //cancel the rent
//             await wStream.connect(LoanTaker).cancelLendToken(erc721NFT.address, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('2'); // LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.eq(wStream.address);
//             }

//             // repay the loan
//             await wStream.connect(LoanTaker).repayLoan(erc721NFT.address, 0, {
//                 value: ethers.utils.parseEther('1.11'),
//             });

//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('0'); // INIT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(LoanTaker.address);
//             }
//         });

//         it('Should be able to rent and then loan the token', async () => {
//             // given for rent
//             const { wStream, Rentee, erc721NFT, Renter, deployer } =
//                 await deployLendToken();
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             // when user rents
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 10, [], { value: 11 });
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('1'); // RENT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 70,
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10000,
//                 interestRateProtocol: 10,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);

//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPoolByIndex(0);
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanPoolArray.totalLoanOffer.toNumber()).to.eq(1);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             balanceBefore = await ethers.provider.getBalance(Renter.address);

//             // take loan offer
//             await wStream.connect(Renter).processLoan(0, 0, 0);
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             balanceAfter = await ethers.provider.getBalance(Renter.address);

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);

//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//                 expect(balanceAfter).gt(balanceBefore);
//             }

//             await time.increase(3600);

//             // user returns it
//             await wStream.connect(deployer).expireRent(erc721NFT.address, 0);

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             }

//             //cancel the rent
//             await wStream.connect(Renter).cancelLendToken(erc721NFT.address, 0);

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('2'); // LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             // repay the loan
//             await wStream.connect(Renter).repayLoan(erc721NFT.address, 0, {
//                 value: ethers.utils.parseEther('1.11'),
//             });
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('0'); // INIT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
//             }
//         });

//         it('LendToken -> Process Loan -> Process Rent -> Repay loan', async () => {
//             // given for rent
//             const { wStream, Rentee, erc721NFT, Renter, deployer } =
//                 await deployLendToken();
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 70,
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10000,
//                 interestRateProtocol: 10,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             await wStream.connect(Renter).processLoan(0, 0, 0);
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             // when user rents
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 10, [], { value: 11 });
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             }

//             await time.increase(3600);

//             // repay the loan
//             await wStream.connect(Renter).repayLoan(erc721NFT.address, 0, {
//                 value: ethers.utils.parseEther('1.11'),
//             });
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('1'); // RENT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             }

//             // user returns it
//             await wStream.connect(deployer).expireRent(erc721NFT.address, 0);

//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             }

//             //cancel the rent
//             await wStream.connect(Renter).cancelLendToken(erc721NFT.address, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('0'); // INIT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(Renter.address);
//                 expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             }
//         });

//         it('LendToken -> Process Loan -> Process Rent ->  Expire loan', async () => {
//             // given for rent
//             const { wStream, Rentee, erc721NFT, Renter, deployer, acc3 } =
//                 await deployLendToken();
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 40,
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10,
//                 interestRateProtocol: 1,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             // take loan offer - STALE_AND_LOAN
//             await wStream.connect(Renter).processLoan(0, 0, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             // when user rents
//             await wStream
//                 .connect(Rentee)
//                 .processRent(erc721NFT.address, 0, 10, [], { value: 11 });
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('3'); // RENT_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(Rentee.address);
//             }

//             await time.increase(3600);

//             //expire rent
//             await wStream.connect(acc3).expireRent(erc721NFT.address, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//                 expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             }

//             // expire loan
//             await wStream.connect(acc3).expireLoan(erc721NFT.address, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('0'); // RENT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(deployer.address);
//                 expect(await wStream.ownerOf(1)).to.equal(wStream.address);
//             }
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });

//         it('LendToken -> Process Loan ->  Expire rent', async () => {
//             // given for rent
//             const { wStream, Rentee, erc721NFT, Renter, deployer, acc3 } =
//                 await deployLendToken();
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 40,
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10,
//                 interestRateProtocol: 1,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             // take loan offer - STALE_AND_LOAN
//             await wStream.connect(Renter).processLoan(0, 0, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             await time.increase(3600);

//             //expire loan
//             await wStream.connect(acc3).expireLoan(erc721NFT.address, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('0'); // INIT
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(deployer.address);
//             }
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });

//         it('LendToken -> Process Loan ->  Repay loan', async () => {
//             // given for rent
//             const { wStream, Rentee, erc721NFT, Renter, deployer, acc3 } =
//                 await deployLendToken();
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }

//             //create loan pool
//             let param1 = {
//                 initializerKey: ethers.constants.AddressZero,
//                 tokenAddress: erc721NFT.address,
//                 loanDurationInMinutes: 70,
//                 // gracePeriodInMinutes: 30,
//                 apy: 10,
//                 interestRateLender: 10000,
//                 interestRateProtocol: 10,
//                 totalLoanOffer: 10,
//                 lastBidAmount: 0,
//                 bidNftFloorPrice: 0,
//             };
//             await wStream.connect(deployer).createLoanPool(param1);
//             // LOAN STATE CHECKS
//             {
//                 let loanPoolArray = await wStream.getLoanPool();
//                 expect(loanPoolArray.length).to.eq(1);
//             }

//             // add loan offer
//             let param2 = {
//                 bidderPubkey: deployer.address,
//                 bidAmount: ethers.utils.parseEther('1'),
//                 LoanPoolIndex: 0,
//                 totalBids: 1,
//                 pendingLoans: 0,
//             };
//             await wStream
//                 .connect(deployer)
//                 .addLoanOffer(param2, { value: ethers.utils.parseEther('1') });
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }

//             // take loan offer - STALE_AND_LOAN
//             await wStream.connect(Renter).processLoan(0, 0, 0);
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('5'); // STALE_AND_LOAN
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(1);
//             }

//             await time.increase(3600);

//             //repay loan
//             await wStream.connect(Renter).repayLoan(erc721NFT.address, 0, {
//                 value: ethers.utils.parseEther('1.11'),
//             });
//             // STATE CHECKS
//             {
//                 const assetManager = await wStream.assetManager(erc721NFT.address, 0);
//                 const rentState = ethers.BigNumber.from('4'); // STALE
//                 expect(assetManager[3]).to.eq(rentState);
//                 expect(await erc721NFT.ownerOf(0)).to.equal(wStream.address);
//             }
//             // LOAN STATE CHECKS
//             {
//                 let loanOffer = await wStream.getLoanOfferAtIndex(0, 0);
//                 expect(loanOffer.pendingLoans.toNumber()).to.eq(0);
//             }
//         });
//     });
// });