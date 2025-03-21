const { expect } = require("chai");
const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox-viem/network-helpers");
const { generateProof, getUsernameHash } = require("../src/utils");
const { decodeEventLog, encodeFunctionData } = require("viem");

describe("HashVerifier", function () {
  // Test credentials
  const testUsername = "alice";
  const testUsername2 = "bob";
  const testPassword = "password123";
  const testNonce = "1234567890";
  const depositAmount = 100_000_000n; // 100 USDC (6 decimals)
  const payAmount = 50_000_000n; // 50 USDC

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

  describe("Deployment", function () {
    it("Should set the correct verifier and USDC addresses", async function () {
      const { vault, verifier, mockUSDC } = await loadFixture(deployFixture);

      const verifierAddress = await vault.read.verifier();
      const usdcAddress = await vault.read.usdc();

      // Convert addresses to lowercase for comparison
      expect(verifierAddress.toLowerCase()).to.equal(verifier.address.toLowerCase());
      expect(usdcAddress.toLowerCase()).to.equal(mockUSDC.address.toLowerCase());
    });
  });

  describe("Deposits and Payments", function () {
    let aliceUsernameHash, bobUsernameHash;

    beforeEach(async function () {
      aliceUsernameHash = await getUsernameHash(testUsername);
      bobUsernameHash = await getUsernameHash(testUsername2);
    });

    it("Should allow depositing USDC", async function () {
      const { vault, mockUSDC, user, publicClient } = await loadFixture(deployFixture);

      // Approve USDC spending
      const approveTx = await mockUSDC.write.approve([vault.address, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Encode deposit function data
      const data = encodeFunctionData({
        abi: vault.abi,
        functionName: 'deposit',
        args: [await aliceUsernameHash, depositAmount]
      });

      // Send transaction with encoded data using the wallet client
      const hash = await user.sendTransaction({
        to: vault.address,
        data,
      })
    //   const hash = await user.writeContract({
    //     address: vault.address,
    //     // abi: vault.abi,
    //     // functionName: 'deposit',
    //     // args: [await aliceUsernameHash, depositAmount]
    //   });

      // Wait for transaction and get receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
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
      expect(decodedEvent.args.usernameHash).to.equal(await aliceUsernameHash);
      expect(decodedEvent.args.amount).to.equal(depositAmount);

      // Check balance
      const balance = await vault.read.balances([await aliceUsernameHash]);
      expect(balance).to.equal(depositAmount);
    });

    it("Should not allow depositing zero amount", async function () {
      const { vault, mockUSDC, user, publicClient } = await loadFixture(deployFixture);

      // Approve USDC spending
      const approveTx = await mockUSDC.write.approve([vault.address, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Attempt to deposit zero
      await expect(
        vault.write.deposit([await aliceUsernameHash, 0n], { account: user.account })
      ).to.be.rejectedWith(/Amount must be greater than 0/);
    });

    it("Should allow paying USDC between users", async function () {
      const { vault, mockUSDC, user, publicClient } = await loadFixture(deployFixture);

      // Approve and deposit first
      const approveTx = await mockUSDC.write.approve([vault.address, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      const depositTx = await vault.write.deposit([await aliceUsernameHash, depositAmount], { account: user.account });
      await publicClient.waitForTransactionReceipt({ hash: depositTx });

      // Generate new proof for payment
      const paymentProof = await generateProof(testUsername, testPassword, "9876543210");
      const paymentFormatted = {
        pi_a: paymentProof.proof.pi_a.slice(0, 2),
        pi_b: [
          [paymentProof.proof.pi_b[0][1], paymentProof.proof.pi_b[0][0]],
          [paymentProof.proof.pi_b[1][1], paymentProof.proof.pi_b[1][0]]
        ],
        pi_c: paymentProof.proof.pi_c.slice(0, 2)
      };

      // Make payment
      const hash = await vault.write.pay(
        [
          paymentFormatted.pi_a,
          paymentFormatted.pi_b,
          paymentFormatted.pi_c,
          await aliceUsernameHash,
          await bobUsernameHash,
          paymentProof.publicSignals[1],
          paymentProof.publicSignals[2],
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
      expect(decodedEvent.args.fromUsernameHash).to.equal(await aliceUsernameHash);
      expect(decodedEvent.args.toUsernameHash).to.equal(await bobUsernameHash);
      expect(decodedEvent.args.amount).to.equal(payAmount);

      // Check balances
      const aliceBalance = await vault.read.balances([await aliceUsernameHash]);
      const bobBalance = await vault.read.balances([await bobUsernameHash]);

      expect(aliceBalance).to.equal(depositAmount - payAmount);
      expect(bobBalance).to.equal(payAmount);
    });
  });
}); 