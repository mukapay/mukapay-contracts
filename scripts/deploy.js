require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // // // Deploy MockUSDC first
  // const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  // const mockUSDC = await MockUSDC.deploy();
  // await mockUSDC.waitForDeployment();
  // console.log(`MockUSDC deployed to: ${await mockUSDC.getAddress()}`);

  // // Deploy the Verifier contract
  // const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  // const verifier = await Verifier.deploy();
  // await verifier.waitForDeployment();
  // console.log(`Verifier deployed to: ${await verifier.getAddress()}`);

  // Deploy Vault with the Verifier and MockUSDC addresses
  const Vault = await hre.ethers.getContractFactory("Vault");
  console.log(process.env.VERIFIER_ADDRESS, process.env.USDC_ADDRESS)
  const vault = await Vault.deploy(process.env.VERIFIER_ADDRESS, process.env.USDC_ADDRESS);
  await vault.waitForDeployment();
  console.log(`Vault deployed to: ${await vault.getAddress()}`);

  console.log("\nDeployment complete! Contract addresses:");
  console.log("----------------------------------------");
  console.log(`USDC: ${process.env.USDC_ADDRESS}`);
  console.log(`Verifier: ${process.env.VERIFIER_ADDRESS}`);
  console.log(`Vault: ${await vault.getAddress()}`);





    // mainnet Deployment complete! Contract addresses:
    // ----------------------------------------
    // USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    // Verifier: 0xF8420F6391047A4a86e540e103e5c69Af2096652
    // Vault: 0xacC07577A4324cf6bC12A049B33Cf906c5567099
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 