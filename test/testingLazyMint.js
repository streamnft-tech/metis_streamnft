const { expect } = require('chai');
const { ethers } = require('hardhat');
const hardhat = require("hardhat");
const { LazyMinter } = require('./LazyMinter');

describe("Testing Lazy Minting" ,async () => {
    it("Test1" ,async ()=> {
        const signers = await ethers.getSigners();
        const minter = signers[0];
        const redeemer = signers[1];

        const Public721 = await ethers.getContractFactory('Public721V1')
        const contract = await Public721.deploy()
        await contract.deployed()
        console.log('contract deployed:', contract.address)
        await contract.connect(minter).init("Name", "Symbol", 0, 100, minter.address);

        const lazyMinter = new LazyMinter({ contract, signer: minter })
        const voucher = await lazyMinter.createVoucher(1, "URI")

        await contract.connect(redeemer).redeem(redeemer.address, voucher, {value : 100});
        console.log("Redeemed");

    })
})
  