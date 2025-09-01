const stream = require('streamnft-evm-staging');
// const { ethers } = require("ethers");
const { ErrorDecoder } = require('ethers-decode-error');
const { ethers } = require('hardhat');

function getCallOptions(chainId) {
  if (chainId == 80002) {
    console.log("inside 80002");
    return {
      gasLimit: 200000,
      maxPriorityFeePerGas: ethers.parseUnits("45", "gwei"),
      maxFeePerGas: ethers.parseUnits("45", "gwei"),
    };
  } else if (chainId == 75338) {
    console.log("app layer: ", {
      type: 2,
      maxFeePerGas: ethers.utils.parseUnits("45", "gwei"), // 6.5 Gwei
      maxPriorityFeePerGas: ethers.utils.parseUnits("45", "gwei"), // 1.5 Gwei
    });

    return {
      type: 2,
      maxFeePerGas: ethers.utils.parseUnits("45", "gwei"), // 6.5 Gwei
      maxPriorityFeePerGas: ethers.utils.parseUnits("45", "gwei"), // 1.5 Gwei
    };
  } else if (chainId == 295 || chainId == 296) {
    return { gasLimit: 800000 };
  } else if (chainId == 656476 || chainId == 97 || chainId == 41923) {
    return {};
  } else {
    console.log("defaulting");
    return { gasLimit: 800000 };
  }
}

// async function test(){
//   let a= await stream.getFee(656476,3,"0x9a40c4934a36885b54C49342fF2c21d6c51AAA2B");
//   console.log(a);
// }
// test();
async function  lendAsset(){
    let signer= await stream.getSigner(
      133717,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285",
      "https://hyperion-testnet.metisdevops.link");
    console.log(signer.address);
    await stream.approveToken("0x9bfDbB159C50a6a95c1fC4FA703773f14213BD6F","0x95959450569719B7241f09346B2bE09FDdBdb05C",1,signer,133717),
    await stream.lendToken(
      "0x9bfDbB159C50a6a95c1fC4FA703773f14213BD6F",
      1, // tokenId
      1, // ratePerMinute
      30, // validityMinutes
      false, //isFixed
      10, // fixedMinutes
      0, // ownershare
      [], // whitelist
      1,
      false,
      0,
      133717,
      signer,
      null,
      "0x95959450569719B7241f09346B2bE09FDdBdb05C",
      false
    );
}
// lendAsset();

// async function rent(){
//   const errorDecoder = ErrorDecoder.create();
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   try{
//     const tx=await stream.processRent("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",2,0,1,60,false,80002,signer,"dev","0x9513D840C2572f860558a412384cd3bD0b8c8e73");
//     tx.wait();
//   } catch(err){
//     const { reason, type } = await errorDecoder.decode(err)

//     // Prints "ERC20: transfer to the zero address"
//     console.log('Revert reason:', reason)
//     // Prints "true"
//     console.log(type === ErrorType.RevertError)
//     }
// }
// rent();

async function  listAsset(){
  // let signer= stream.getSigner("965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285");
  let assets = await stream.getAssetManagerByChain(
    "0xADA256fB3Fc28f40692EF385c5890c4Ea242664e",
    3012, // tokenId
    41923,null,"0x4c1376f36a7d64Fd35Fd7D063608e5Ca9b3dc3Bd","https://rpc.edu-chain.raas.gelato.cloud/6e143dc04e874712aeb8f0d67aec8210" 
  );
  console.log(assets);
  console.log(assets.data.rentState.loanExpiry.toNumber());
}

// listAsset();

async function launch_functional(){
  const chainId=  85432;
  const defaultLaunchpadInput = {
    _royaltyBps: 3000,
    _dropPhases: [],
    _privateDrops: [],
  };
  let signer= await stream.getSigner(chainId,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://sepolia.base.org");
  // let signer= await stream.getSigner(75338,"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80","http://localhost:8545/");
  let assets = await stream.launchToken(
    11,
    "a","b",100,1,"",defaultLaunchpadInput,chainId,signer,"0xeFef28E35c98DaCe9D2142FDa2c0eb27002a4f80");
  console.log(assets);
  const dropPhases = [{
            mintPrice: 0,
            mintFee: 0,
            startTime: Math.floor(new Date().getTime()/1000), // Current time in seconds
            endTime: Math.floor(new Date().getTime()/1000) + 86400, // 24 hours later
            maxSupply: 2,
            maxWalletMint:1,
            isTokenGated: false,
            isWhitelisted: true,
          }]
  const leafNodes = ["0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd","0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"].map((json) =>
        ethers.utils.keccak256(Buffer.from(json.replace("0x", ""), "hex"))
      );
   const merkelRoot = await stream.generateMerkleRoot(leafNodes);
   const privateDrop = [{
              gatedTokenAddress: ethers.constants.AddressZero,
              merkleRoot: merkelRoot
            }];
  const launchpadInput = {
          _royaltyBps: 0, // Convert percentage to basis points (e.g. 5% = 500)
          _dropPhases: dropPhases,
          _privateDrops: privateDrop
        };
  const tokenContract = await ethers.getContractAt('ERC1155Advanced',assets.data);
  let txn = await tokenContract.createToken(
          1,
          "",
          launchpadInput, getCallOptions(chainId)

        );
  let receipt = await txn.wait();
  console.log("receipt: ",receipt);
  const proof = await stream.generateMerkleProof1(["0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd","0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],"0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd");
  console.log("proof: ",proof);
  txn = await tokenContract.mint(signer.address, 1, 1, 0, proof.user1Proof,{...getCallOptions(chainId),value:0});
  receipt = await txn.wait();
  console.log("receipt: ",receipt);
}
async function launch(){
  const chainId=  75338;
  const defaultLaunchpadInput = {
    _royaltyBps: 3000,
    _dropPhases: [],
    _privateDrops: [],
  };
  let signer= await stream.getSigner(chainId,"0xe89ef6409c467285bcae9f80ab1cfeb3487cfe61ab28fb7d36443e1daa0c2867","https://applayertestapi.loclx.io");
  // let signer= await stream.getSigner(75338,"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80","http://localhost:8545/");
  let assets = await stream.launchToken(
    11,
    "a","b",100,1,"",defaultLaunchpadInput,chainId,signer,"0xAfd222bF4549dEaEA9C88024a8c0b8efA1761798");
  console.log(assets);
  const dropPhases = [{
            mintPrice: 0,
            mintFee: 0,
            startTime: Math.floor(new Date().getTime()/1000), // Current time in seconds
            endTime: Math.floor(new Date().getTime()/1000) + 86400, // 24 hours later
            maxSupply: 2,
            maxWalletMint:1,
            isTokenGated: false,
            isWhitelisted: false,
          }]
  const leafNodes = ["0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd","0x00dead00665771855a34155f5e7405489df2c3c6"].map((json) =>
        ethers.utils.keccak256(Buffer.from(json.replace("0x", ""), "hex"))
      );
   const merkelRoot = await stream.generateMerkleRoot(leafNodes);
   const privateDrop = [{
              gatedTokenAddress: ethers.constants.AddressZero,
              merkleRoot: merkelRoot
            }];
  const launchpadInput = {
          _royaltyBps: 0, // Convert percentage to basis points (e.g. 5% = 500)
          _dropPhases: dropPhases,
          _privateDrops: []
        };
  const tokenContract = await ethers.getContractAt('ERC1155Advanced',assets.data);
  let txn = await tokenContract.createToken(
          1,
          "",
          launchpadInput, getCallOptions(chainId)
        );
  let receipt = await txn.wait();
  console.log("receipt: ",receipt);
  const proof = await stream.generateMerkleProof1(["0xFB18E6FF5F94Bdf0115Ed4c61F9Cf49041245dEd","0x00dead00665771855a34155f5e7405489df2c3c6"],"0x00dead00665771855a34155f5e7405489df2c3c6");
  console.log("proof: ",proof);
  await wait(2000);
  txn = await tokenContract.mint(signer.address, 1, 1, 0, [],{...getCallOptions(chainId),value:0});
  // const signedTx = await signer.signTransaction(txn);
  // const txHash = await network.provider.send("eth_sendRawTransaction", [signedTx]);
  // console.log("tx hash:", txHash);
  receipt = await txn.wait();
  console.log("receipt: ",receipt);
}
// launch();

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// async function cancelRent(){
//   let signer= await stream.getSigner(11155111,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285");
//   await stream.cancelLendToken();
// }

// async function listAsset(){
//   const value=await stream.getAssetsByCollection("0x00000000000000000000000000000000003a05ad",296);
//   console.log(value);
// }
// listAsset();

async function createLoanPool(){
  let signer= await stream.getSigner(133717,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://hyperion-testnet.metisdevops.link");
  // let signer= await stream.getSigner(0,"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80","http://127.0.0.1:8545/");

  console.log(signer.address);
  let txn=await stream.createLoanPool("0x9bfDbB159C50a6a95c1fC4FA703773f14213BD6F",24*60*7,10,10000,133717,signer,"0x1DEfef07FdC8723fA50fFc683770065DDdB5E482");
  console.log(txn);
}
createLoanPool()

// async function getNFTPool(){
//   // let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   // console.log(signer.address);
//   let txn=await stream.getNFTPoolByChain("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",25,80002,undefined,"0x9513D840C2572f860558a412384cd3bD0b8c8e73","https://rpc-amoy.polygon.technology");
//   console.log(txn);
// }
// getNFTPool()

// async function getLoanOffer(){
//   // let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   // console.log(signer.address);
//   let txn=await stream.getLoanOffer(9,14,80002,null,"0x9513D840C2572f860558a412384cd3bD0b8c8e73","https://rpc-amoy.polygon.technology");
//   ("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",25,80002,undefined,"0x9513D840C2572f860558a412384cd3bD0b8c8e73","https://rpc-amoy.polygon.technology");
//   console.log(txn);
// }
// getLoanOffer()

// async function acceptOffer(){
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   let pool = await stream.createNFTPool("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",26,10,10,10,0,false,false,80002,signer,undefined,"0x9513D840C2572f860558a412384cd3bD0b8c8e73");
//   console.log("pool ius: ",pool);
//   signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   let txn=await stream.acceptOffer("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",26,pool.data,80002,signer,undefined,"0x9513D840C2572f860558a412384cd3bD0b8c8e73","https://rpc-amoy.polygon.technology");
//   console.log("pool ius: ",txn);
// }
// acceptOffer()

// async function createLoanOffer(){
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   console.log(signer.address);
//   let txn=await stream.addLoanOffer(0,100,3,80002,signer,"0x9513D840C2572f860558a412384cd3bD0b8c8e73");
//   console.log(txn);
// }
// createLoanOffer()

// async function getMasterIndex(){
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
// await stream.getMaster("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",2,0,"0x9513D840C2572f860558a412384cd3bD0b8c8e73",80002,
//   signer);
// }
// getMasterIndex()

// async function getAssetManagerFungible(){
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   await stream.getFungibleAsset("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",6,3,"0x9513D840C2572f860558a412384cd3bD0b8c8e73",80002,
//   signer);
// }
// getAssetManagerFungible();

// async function processLoan(){
//     let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//     // let approve=await stream.approveToken1155("0x49E60429387f5d7F8Cccc8ed898B5242eA225191","0x9513D840C2572f860558a412384cd3bD0b8c8e73",signer);
//     // approve.wait();
//     console.log("done");
//     let loan=await stream.processLoan(0,0,1,0,false,false,80002,signer,"dev","0x9513D840C2572f860558a412384cd3bD0b8c8e73");
//     loan.wait();
// }
// processLoan();

// async function repayLoan(){
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   await stream.repayLoan("0x3447Dfad52d6371C9A4A4fCc50C601210177f1ae",8,0,80002,signer,"0x9513D840C2572f860558a412384cd3bD0b8c8e73");
// }
// repayLoan();

// async function getStreamConfig(){
//   let signer= await stream.getSigner(80002,"965a2a8bd06a3457b26e4f38f81d335ae9834ec52f431d87f3b7b6b0b21af285","https://rpc-amoy.polygon.technology");
//   let val= await stream.getStreamConfig(80002,null,"0x9513D840C2572f860558a412384cd3bD0b8c8e73");
//   console.log(val);
// }
// getStreamConfig();