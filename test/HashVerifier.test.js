const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generateProof } = require("../src/utils");

describe("HashVerifier", function () {
  let hashVerifier;
  let verifier;
  let owner;
  let user;

  // Test credentials
  const testUsername = "alice";
  const testPassword = "password123";
  const testNonce = "1234567890";

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy the Verifier contract first (this is the one generated by circom)
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    // Deploy HashVerifier with the Verifier address
    const HashVerifier = await ethers.getContractFactory("HashVerifier");
    hashVerifier = await HashVerifier.deploy(await verifier.getAddress());
    await hashVerifier.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct verifier address", async function () {
      expect(await hashVerifier.verifier()).to.equal(await verifier.getAddress());
    });
  });

  describe("Registration", function () {
    let usernameHash, resultHash;

    beforeEach(async function () {
      // Generate hashes using the utility function
      const { publicSignals } = await generateProof(testUsername, testPassword, testNonce);
      usernameHash = publicSignals[0];  // username hash is first public signal
      resultHash = publicSignals[2];     // result hash is third public signal
    });

    it("Should allow registering a new username hash", async function () {
      await expect(hashVerifier.register(usernameHash, resultHash))
        .to.emit(hashVerifier, "UsernameRegistered")
        .withArgs(usernameHash, resultHash);

      expect(await hashVerifier.resultHashes(usernameHash)).to.equal(resultHash);
    });

    it("Should not allow registering the same username hash twice", async function () {
      await hashVerifier.register(usernameHash, resultHash);

      await expect(
        hashVerifier.register(usernameHash, resultHash)
      ).to.be.revertedWith("Username already registered");
    });
  });

  describe("Verification", function () {
    let proofData;

    beforeEach(async function () {
      // Generate a valid proof
      proofData = await generateProof(testUsername, testPassword, testNonce);
      
      // Register the username hash
      await hashVerifier.register(proofData.publicSignals[0], proofData.publicSignals[2]);
    });

    it("Should verify valid proof", async function () {
      // Format the proof data for the verifier
      const pi_a = proofData.proof.pi_a.slice(0, 2); // Remove the last element (1)
      const pi_b = [  // Swap x and y coordinates for each point
        [proofData.proof.pi_b[0][1], proofData.proof.pi_b[0][0]],
        [proofData.proof.pi_b[1][1], proofData.proof.pi_b[1][0]]
      ];
      const pi_c = proofData.proof.pi_c.slice(0, 2); // Remove the last element (1)

      await expect(
        hashVerifier.verify(
          pi_a,
          pi_b,
          pi_c,
          proofData.publicSignals[0],
          proofData.publicSignals[1]
        )
      )
        .to.emit(hashVerifier, "ProofVerified")
        .withArgs(proofData.publicSignals[0], proofData.publicSignals[1]);
    });

    it("Should not allow using the same nonce twice", async function () {
      const pi_a = proofData.proof.pi_a.slice(0, 2);
      const pi_b = [
        [proofData.proof.pi_b[0][1], proofData.proof.pi_b[0][0]],
        [proofData.proof.pi_b[1][1], proofData.proof.pi_b[1][0]]
      ];
      const pi_c = proofData.proof.pi_c.slice(0, 2);

      // First verification should succeed
      await hashVerifier.verify(
        pi_a,
        pi_b,
        pi_c,
        proofData.publicSignals[0],
        proofData.publicSignals[1]
      );

      // Second verification with same proof should fail
      await expect(
        hashVerifier.verify(
          pi_a,
          pi_b,
          pi_c,
          proofData.publicSignals[0],
          proofData.publicSignals[1]
        )
      ).to.be.revertedWith("Nonce already used");
    });

    it("Should not verify proof for unregistered username", async function () {
      const differentProof = await generateProof("bob", testPassword, testNonce);
      const pi_a = differentProof.proof.pi_a.slice(0, 2);
      const pi_b = [
        [differentProof.proof.pi_b[0][1], differentProof.proof.pi_b[0][0]],
        [differentProof.proof.pi_b[1][1], differentProof.proof.pi_b[1][0]]
      ];
      const pi_c = differentProof.proof.pi_c.slice(0, 2);

      await expect(
        hashVerifier.verify(
          pi_a,
          pi_b,
          pi_c,
          differentProof.publicSignals[0],
          differentProof.publicSignals[1]
        )
      ).to.be.revertedWith("Username not registered");
    });
  });
}); 