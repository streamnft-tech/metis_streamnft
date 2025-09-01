const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
// const keccak256 = require("keccak256");

async function testERC721Advanced() {
  console.log("Starting ERC721Advanced test...");

  // Get signers for testing
  const [deployer, user1, user2, user3] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("User1 address:", user1.address);
  console.log("User2 address:", user2.address);
  console.log("User3 address:", user3.address);

  // Deploy a mock ERC721 token for token gating tests
  console.log("\nDeploying mock ERC721 for token gating...");
  const MockERC721Factory = await ethers.getContractFactory("MockERC721");
const mockERC721 = await MockERC721Factory.deploy("MockToken", "MCK");
await mockERC721.deployed();

  console.log("Mock ERC721 deployed at:", mockERC721.address);
  
  // Mint a token to user2 for token gating test
  await mockERC721.mint(user2.address);
  console.log("Minted Mock token to user2");

  // Create a whitelist Merkle tree
  // Include user1 and user3 in the whitelist
  const whitelistAddresses = [
    user1.address,
    user3.address
  ];
  
  // Create Merkle Tree
  const leafNodes = whitelistAddresses.map(addr => 
    ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [addr]))
  );
  const merkleTree = new MerkleTree(leafNodes, ethers.utils.keccak256, { sortPairs: true });
  const rootHash = merkleTree.getRoot();
  console.log("Merkle Root:", "0x" + rootHash.toString('hex'));

  // Get Diamond contract
  const diamondAddress = "0x525C7063E7C20997BaaE9bDa922159152D0e8417";
  const tokenLaunch = await ethers.getContractAt("TokenLaunch", diamondAddress);

  // Token parameters
  const tokenName = "Test Advanced Token";
  const tokenSymbol = "TAT";
  const tokenURI = "https://example.com/metadata/";
  const maxSupply = 1000;
  const mintPrice = ethers.utils.parseEther("0.1");
  const mintFee = ethers.utils.parseEther("0.01");
  const launchFee = ethers.utils.parseEther("1");

  // Get current time for phased drops
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  // Create multiple drop phases for testing
  const dropPhases = [
    {
      // Phase 0: Public mint
      mintPrice,
      mintFee,
      startTime: currentTimestamp - 60, // Started 1 minute ago
      endTime: currentTimestamp + 3600, // Ends in 1 hour
      maxSupply: 100,
      maxWalletMint: 2,
      isTokenGated: false,
      isWhitelisted: false,
    },
    {
      // Phase 1: Whitelist mint
      mintPrice: ethers.utils.parseEther("0.08"), // Discounted price
      mintFee,
      startTime: currentTimestamp - 60, // Started 1 minute ago
      endTime: currentTimestamp + 3600, // Ends in 1 hour
      maxSupply: 200,
      maxWalletMint: 3,
      isTokenGated: false,
      isWhitelisted: true,
    },
    {
      // Phase 2: Token-gated mint
      mintPrice: ethers.utils.parseEther("0.05"), // Further discounted
      mintFee,
      startTime: currentTimestamp - 60, // Started 1 minute ago
      endTime: currentTimestamp + 3600, // Ends in 1 hour
      maxSupply: 300,
      maxWalletMint: 5,
      isTokenGated: true,
      isWhitelisted: false,
    },
    {
      // Phase 3: Future mint (not active yet)
      mintPrice,
      mintFee,
      startTime: currentTimestamp + 7200, // Starts in 2 hours
      endTime: currentTimestamp + 14400, // Ends in 4 hours
      maxSupply: 400,
      maxWalletMint: 2,
      isTokenGated: false,
      isWhitelisted: false,
    }
  ];

  // Create private drop configurations for whitelist and token-gated phases
  const privateDrops = [
    {
      // For Phase 1: Whitelist
      gatedTokenAddress: ethers.constants.AddressZero, // Not token gated
      merkleRoot: "0x" + rootHash.toString('hex') // Whitelist merkle root
    },
    {
      // For Phase 2: Token gated
      gatedTokenAddress: mockERC721.address, // Our mock token
      merkleRoot: ethers.constants.HashZero // Not whitelist gated
    }
  ];

  const launchpadInput = {
    _royaltyBps: 500, // 5% royalty
    _dropPhases: dropPhases,
    _privateDrops: privateDrops,
  };

  const tokenType = 10; // ERC721Advanced type

  console.log("\nLaunching ERC721Advanced token...");
  const tx = await tokenLaunch.launchToken(
    tokenType,
    tokenName,
    tokenSymbol,
    maxSupply,
    mintPrice,
    tokenURI,
    launchpadInput,
    { value: launchFee }
  );

  const receipt = await tx.wait();

  // Extract token address from event
  const tokenLaunchedEvent = receipt.events?.find((e) => e.event === "TokenLaunched");
  let tokenAddress;

  if (tokenLaunchedEvent) {
    tokenAddress = tokenLaunchedEvent.args.tokenAddress;
  } else {
    const topic = ethers.utils.id("TokenLaunched(address)");
    const fallback = receipt.events?.find((e) => e.topics && e.topics[0] === topic);
    tokenAddress = ethers.utils.defaultAbiCoder.decode(["address"], fallback.data)[0];
  }

  console.log(`ERC721Advanced token deployed at: ${tokenAddress}`);

  const tokenContract = await ethers.getContractAt("ERC721Advanced", tokenAddress);

  // ---------- TEST CASE 1: BASIC MINTING ----------
  console.log("\n--- TEST CASE 1: BASIC MINTING ---");
  console.log("Attempting to mint from public drop (Phase 0)...");
  
  const phase0Cost = dropPhases[0].mintPrice.add(dropPhases[0].mintFee);
  
  // Create empty proof array for non-whitelisted mints
  const emptyProof = [];
  
  try {
    const mintTx = await tokenContract.connect(user1).mint(
      user1.address, 
      0, // Phase 0: Public mint
      emptyProof, 
      { value: phase0Cost }
    );

    const mintReceipt = await mintTx.wait();
    console.log(`✅ Basic mint successful! Gas used: ${mintReceipt.gasUsed.toString()}`);

    const balance = await tokenContract.balanceOf(user1.address);
    console.log(`User1 token balance: ${balance.toString()}`);

    // Get tokenId from Transfer event
    const transferEvent = mintReceipt.events.find(e => e.event === "Transfer");
    const tokenId = transferEvent.args.tokenId;
    const tokenURIResponse = await tokenContract.tokenURI(tokenId);

    console.log(`Token ID: ${tokenId.toString()} - URI: ${tokenURIResponse}`);
  } catch (error) {
    console.error("❌ Basic mint failed:", error.message);
  }

  // ---------- TEST CASE 2: WHITELIST MINTING ----------
  console.log("\n--- TEST CASE 2: WHITELIST MINTING ---");
  console.log("Attempting to mint from whitelist drop (Phase 1)...");
  
  const phase1Cost = dropPhases[1].mintPrice.add(dropPhases[1].mintFee);
  
  // Generate Merkle proof for user1
  const user1Leaf = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [user1.address]));
  const user1Proof = merkleTree.getHexProof(user1Leaf);
  console.log("User1 Merkle Proof:", user1Proof);
  
  try {
    const mintTx = await tokenContract.connect(user1).mint(
      user1.address, 
      1, // Phase 1: Whitelist mint
      user1Proof, 
      { value: phase1Cost }
    );

    const mintReceipt = await mintTx.wait();
    console.log(`✅ Whitelist mint successful! Gas used: ${mintReceipt.gasUsed.toString()}`);

    const balance = await tokenContract.balanceOf(user1.address);
    console.log(`User1 token balance: ${balance.toString()}`);
  } catch (error) {
    console.error("❌ Whitelist mint failed:", error.message);
  }

  // Try with non-whitelisted user (user2)
  console.log("\nAttempting to mint with non-whitelisted user (should fail)...");
  
  // Generate invalid proof for user2 (not in whitelist)
  const user2Leaf = ethers.utils.keccak256(ethers.utils.solidityPack(['address'], [user2.address]));
  const user2Proof = merkleTree.getHexProof(user2Leaf);
  
  try {
    await tokenContract.connect(user2).mint(
      user2.address, 
      1, // Phase 1: Whitelist mint
      user2Proof, 
      { value: phase1Cost }
    );
    console.error("❌ TEST FAILED: Non-whitelisted user was able to mint!");
  } catch (error) {
    console.log(error)
    console.log("✅ Success: Non-whitelisted user correctly prevented from minting");
  }

  // ---------- TEST CASE 3: TOKEN-GATED MINTING ----------
  console.log("\n--- TEST CASE 3: TOKEN-GATED MINTING ---");
  console.log("Attempting to mint from token-gated drop (Phase 2)...");
  
  const phase2Cost = dropPhases[2].mintPrice.add(dropPhases[2].mintFee);
  
  // User2 has the required token
  try {
    const mintTx = await tokenContract.connect(user2).mint(
      user2.address, 
      2, // Phase 2: Token-gated mint
      emptyProof, 
      { value: phase2Cost }
    );

    const mintReceipt = await mintTx.wait();
    console.log(`✅ Token-gated mint successful! Gas used: ${mintReceipt.gasUsed.toString()}`);

    const balance = await tokenContract.balanceOf(user2.address);
    console.log(`User2 token balance: ${balance.toString()}`);
  } catch (error) {
    console.error("❌ Token-gated mint failed:", error.message);
  }

  // Try with user without the required token
  console.log("\nAttempting to mint with user lacking the required token (should fail)...");
  
  try {
    await tokenContract.connect(user3).mint(
      user3.address, 
      2, // Phase 2: Token-gated mint
      emptyProof, 
      { value: phase2Cost }
    );
    console.error("❌ TEST FAILED: User without required token was able to mint!");
  } catch (error) {
    console.log("✅ Success: User without required token correctly prevented from minting");
  }

  // ---------- TEST CASE 4: PER-WALLET LIMIT ----------
  console.log("\n--- TEST CASE 4: PER-WALLET LIMIT ---");
  console.log("Testing max wallet mint limit...");
  
  // User1 already minted once in phase 0, try to mint the max allowed (one more)
  try {
    const mintTx = await tokenContract.connect(user1).mint(
      user1.address, 
      0, // Phase 0: Public mint (max 2 per wallet)
      emptyProof, 
      { value: phase0Cost }
    );

    await mintTx.wait();
    console.log("✅ Second mint successful (reached wallet limit)");
    
    // Try to mint beyond the limit
    try {
      await tokenContract.connect(user1).mint(
        user1.address, 
        0, // Phase 0: Public mint
        emptyProof, 
        { value: phase0Cost }
      );
      console.error("❌ TEST FAILED: User was able to mint beyond wallet limit!");
    } catch (error) {
      console.log("✅ Success: User correctly prevented from minting beyond wallet limit");
    }
  } catch (error) {
    console.error("❌ Second mint failed:", error.message);
  }

  // ---------- TEST CASE 5: FUTURE DROP PHASE ----------
  console.log("\n--- TEST CASE 5: FUTURE DROP PHASE ---");
  console.log("Testing mint from a future drop phase (should fail)...");
  
  const phase3Cost = dropPhases[3].mintPrice.add(dropPhases[3].mintFee);
  
  try {
    await tokenContract.connect(user3).mint(
      user3.address, 
      3, // Phase 3: Future mint (not active yet)
      emptyProof, 
      { value: phase3Cost }
    );
    console.error("❌ TEST FAILED: User was able to mint from inactive drop phase!");
  } catch (error) {
    console.log("✅ Success: User correctly prevented from minting from inactive phase");
  }

  // ---------- TEST CASE 6: PAYMENT VERIFICATION ----------
  console.log("\n--- TEST CASE 6: PAYMENT VERIFICATION ---");
  console.log("Testing incorrect payment amount (should fail)...");
  
  const incorrectAmount = ethers.utils.parseEther("0.05"); // Too low
  
  try {
    await tokenContract.connect(user3).mint(
      user3.address, 
      0, // Phase 0: Public mint
      emptyProof, 
      { value: incorrectAmount }
    );
    console.error("❌ TEST FAILED: Mint succeeded with incorrect payment amount!");
  } catch (error) {
    console.log("✅ Success: Mint correctly rejected with incorrect payment");
  }

  // ---------- SUMMARY ----------
  console.log("\n--- TEST SUMMARY ---");
  console.log(`User1 token balance: ${await tokenContract.balanceOf(user1.address)}`);
  console.log(`User2 token balance: ${await tokenContract.balanceOf(user2.address)}`);
  console.log(`User3 token balance: ${await tokenContract.balanceOf(user3.address)}`);
  console.log(`Total supply: ${await tokenContract.totalSupply()}`);
  
  console.log("\nERC721Advanced tests completed!");
}

testERC721Advanced().catch((err) => {
  console.error("Error running test:", err);
  process.exit(1);
});