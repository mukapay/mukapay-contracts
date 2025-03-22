const { expect } = require("chai");
const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox-viem/network-helpers");
const { generateProof, getUsernameHash, generateCredentialHash } = require("../src/utils");
const { decodeEventLog, encodeFunctionData } = require("viem");

describe("HashVerifier", function () {
  // Test credentials
  const testUsername = "alice";
  const testUsername2 = "bob";
  const testPassword = "password123";
  const testNonce = "1234567890";
  const depositAmount = 100_000_000n; // 100 USDC (6 decimals)
  const payAmount = 50_000_000n; // 50 USDC

  // Helper function to format proof
  const formatProof = (proof) => ({
    pi_a: proof.proof.pi_a.slice(0, 2),
    pi_b: [
      [proof.proof.pi_b[0][1], proof.proof.pi_b[0][0]],
      [proof.proof.pi_b[1][1], proof.proof.pi_b[1][0]]
    ],
    pi_c: proof.proof.pi_c.slice(0, 2)
  });

  async function deployFixture() {
    // Get wallet clients for different accounts
    const [owner, user, user2] = await hre.viem.getWalletClients();
    
    // Get the public client
    const publicClient = await hre.viem.getPublicClient();

    // Deploy MockUSDC
    const mockUSDC = await hre.viem.deployContract("MockUSDC");

    // Deploy Verifier
    const verifier = await hre.viem.deployContract("Groth16Verifier");

    // Deploy Vault with constructor arguments
    const vault = await hre.viem.deployContract("Vault", [
      verifier.address,
      mockUSDC.address
    ]);

    // Mint USDC to users
    await mockUSDC.write.mint([user.account.address, depositAmount]);
    await mockUSDC.write.mint([user2.account.address, depositAmount]);

    return {
      vault,
      verifier,
      mockUSDC,
      owner,
      user,
      user2,
      publicClient
    };
  }

  // Helper function to register a user
  async function registerUser(vault, username, password, account) {
    const usernameHash = await getUsernameHash(username);
    const credentialHash = await generateCredentialHash(username, password);
    const proof = await generateProof(username, password);
    const formatted = formatProof(proof);

    await vault.write.register(
      [
        formatted.pi_a,
        formatted.pi_b,
        formatted.pi_c,
        usernameHash,
        credentialHash,
        proof.publicSignals[2],
        proof.publicSignals[3]
      ],
      { account }
    );

    return { usernameHash, credentialHash };
  }

  describe("Deployment", function () {
    it("Should set the correct verifier and USDC addresses", async function () {
      const { vault, verifier, mockUSDC } = await loadFixture(deployFixture);

      const verifierAddress = await vault.read.verifier();
      const usdcAddress = await vault.read.usdc();

      expect(verifierAddress.toLowerCase()).to.equal(verifier.address.toLowerCase());
      expect(usdcAddress.toLowerCase()).to.equal(mockUSDC.address.toLowerCase());
    });
  });

  describe("Registration", function () {
    let aliceUsernameHash, aliceCredentialHash;

    beforeEach(async function () {
      aliceUsernameHash = await getUsernameHash(testUsername);
      aliceCredentialHash = await generateCredentialHash(testUsername, testPassword);
    });

    it("Should allow user registration with valid proof", async function () {
      const { vault, user, publicClient } = await loadFixture(deployFixture);

      // Generate proof for registration
      const registrationProof = await generateProof(testUsername, testPassword);
      const proofFormatted = formatProof(registrationProof);

      // Register user
      const hash = await vault.write.register(
        [
          proofFormatted.pi_a,
          proofFormatted.pi_b,
          proofFormatted.pi_c,
          await aliceUsernameHash,
          await aliceCredentialHash,
          registrationProof.publicSignals[2],
          registrationProof.publicSignals[3]
        ],
        { account: user.account }
      );

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Find and decode the Registered event
      const registeredEvent = receipt.logs.find(log => 
        log.address.toLowerCase() === vault.address.toLowerCase()
      );
      
      const decodedEvent = decodeEventLog({
        abi: vault.abi,
        data: registeredEvent.data,
        topics: registeredEvent.topics
      });

      expect(decodedEvent.eventName).to.equal("Registered");
      expect(decodedEvent.args.usernameHash).to.equal(await aliceUsernameHash);
      expect(decodedEvent.args.credentialHash).to.equal(await aliceCredentialHash);

      // Check stored credential hash
      const storedCredentialHash = await vault.read.credentialHashes([await aliceUsernameHash]);
      expect(storedCredentialHash).to.equal(await aliceCredentialHash);
    });

    it("Should not allow registering same username twice", async function () {
      const { vault, user } = await loadFixture(deployFixture);

      // First registration
      await registerUser(vault, testUsername, testPassword, user.account);

      // Try second registration with same username
      const proof2 = await generateProof(testUsername, "different_password");
      const formatted2 = formatProof(proof2);

      await expect(
        vault.write.register(
          [
            formatted2.pi_a,
            formatted2.pi_b,
            formatted2.pi_c,
            await aliceUsernameHash,
            proof2.publicSignals[1],
            proof2.publicSignals[2],
            proof2.publicSignals[3]
          ],
          { account: user.account }
        )
      ).to.be.rejectedWith(/Username already registered/);
    });
  });

  describe("Deposits and Payments", function () {
    let aliceUsernameHash, bobUsernameHash, aliceCredentialHash, bobCredentialHash;
    let vault, mockUSDC, user, user2, publicClient;

    beforeEach(async function () {
      const fixture = await loadFixture(deployFixture);
      vault = fixture.vault;
      mockUSDC = fixture.mockUSDC;
      user = fixture.user;
      user2 = fixture.user2;
      publicClient = fixture.publicClient;

      // Register both users
      const aliceRegistration = await registerUser(vault, testUsername, testPassword, user.account);
      const bobRegistration = await registerUser(vault, testUsername2, testPassword, user2.account);

      aliceUsernameHash = aliceRegistration.usernameHash;
      aliceCredentialHash = aliceRegistration.credentialHash;
      bobUsernameHash = bobRegistration.usernameHash;
      bobCredentialHash = bobRegistration.credentialHash;
    });

    it("Should allow depositing USDC to registered user", async function () {
      // Approve USDC spending
      const approveTx = await mockUSDC.write.approve([vault.address, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Deposit
      const depositTx = await vault.write.deposit([aliceUsernameHash, depositAmount], { account: user.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
      
      // Find and decode the Deposited event
      const depositedEvent = receipt.logs.find(log => 
        log.address.toLowerCase() === vault.address.toLowerCase()
      );
      
      const decodedEvent = decodeEventLog({
        abi: vault.abi,
        data: depositedEvent.data,
        topics: depositedEvent.topics
      });

      expect(decodedEvent.eventName).to.equal("Deposited");
      expect(decodedEvent.args.usernameHash).to.equal(aliceUsernameHash);
      expect(decodedEvent.args.amount).to.equal(depositAmount);

      // Check balance
      const balance = await vault.read.balances([aliceUsernameHash]);
      expect(balance).to.equal(depositAmount);
    });

    it("Should not allow depositing to unregistered user", async function () {
      const unregisteredHash = await getUsernameHash("unregistered");

      await expect(
        vault.write.deposit([unregisteredHash, depositAmount], { account: user.account })
      ).to.be.rejectedWith(/User not registered/);
    });

    it("Should allow paying USDC between registered users", async function () {
      // Approve and deposit first
      const approveTx = await mockUSDC.write.approve([vault.address, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      const depositTx = await vault.write.deposit([aliceUsernameHash, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: depositTx });

      // Generate new proof for payment
      const paymentProof = await generateProof(testUsername, testPassword, "9876543210");
      const paymentFormatted = formatProof(paymentProof);

      // Make payment
      const hash = await vault.write.pay(
        [
          paymentFormatted.pi_a,
          paymentFormatted.pi_b,
          paymentFormatted.pi_c,
          aliceUsernameHash,
          bobUsernameHash,
          aliceCredentialHash,
          paymentProof.publicSignals[2],
          paymentProof.publicSignals[3],
          payAmount
        ],
        { account: user.account }
      );

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Find and decode the Paid event
      const paidEvent = receipt.logs.find(log => 
        log.address.toLowerCase() === vault.address.toLowerCase()
      );
      
      const decodedEvent = decodeEventLog({
        abi: vault.abi,
        data: paidEvent.data,
        topics: paidEvent.topics
      });

      expect(decodedEvent.eventName).to.equal("Paid");
      expect(decodedEvent.args.fromUsernameHash).to.equal(aliceUsernameHash);
      expect(decodedEvent.args.toUsernameHash).to.equal(bobUsernameHash);
      expect(decodedEvent.args.amount).to.equal(payAmount);

      // Check balances
      const aliceBalance = await vault.read.balances([aliceUsernameHash]);
      const bobBalance = await vault.read.balances([bobUsernameHash]);

      expect(aliceBalance).to.equal(depositAmount - payAmount);
      expect(bobBalance).to.equal(payAmount);
    });

    it("Should not allow payment with wrong password", async function () {
      // Approve and deposit first
      const approveTx = await mockUSDC.write.approve([vault.address, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      const depositTx = await vault.write.deposit([aliceUsernameHash, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: depositTx });

      // Generate proof with wrong password
      const wrongProof = await generateProof(testUsername, "wrong_password", "9876543210");
      const wrongFormatted = formatProof(wrongProof);

      // Try payment with wrong password
      await expect(
        vault.write.pay(
          [
            wrongFormatted.pi_a,
            wrongFormatted.pi_b,
            wrongFormatted.pi_c,
            aliceUsernameHash,
            bobUsernameHash,
            wrongProof.publicSignals[1],
            wrongProof.publicSignals[2],
            wrongProof.publicSignals[3],
            payAmount
          ],
          { account: user.account }
        )
      ).to.be.rejectedWith(/Invalid credentials/);
    });
  });
}); 