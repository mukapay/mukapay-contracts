require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // // Deploy MockUSDC first
  // const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  // const mockUSDC = await MockUSDC.deploy();
  // await mockUSDC.waitForDeployment();
  // console.log(`MockUSDC deployed to: ${await mockUSDC.getAddress()}`);

  // Deploy the Verifier contract
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log(`Verifier deployed to: ${await verifier.getAddress()}`);

  // Deploy Vault with the Verifier and MockUSDC addresses
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(await verifier.getAddress(), process.env.USDC_ADDRESS);
  await vault.waitForDeployment();
  console.log(`Vault deployed to: ${await vault.getAddress()}`);

  console.log("\nDeployment complete! Contract addresses:");
  console.log("----------------------------------------");
  console.log(`USDC: ${process.env.USDC_ADDRESS}`);
  console.log(`Verifier: ${await verifier.getAddress()}`);
  console.log(`Vault: ${await vault.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 