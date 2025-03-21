require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require('@nomicfoundation/hardhat-viem')

// Check if PRIVATE_KEY is set in .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_API_KEY = process.env.BASE_API_KEY;

if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

if (!BASE_API_KEY) {
  throw new Error("Please set your BASE_API_KEY in a .env file");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    "base-sepolia": {
      url: BASE_API_KEY,
      accounts: [PRIVATE_KEY],
      chainId: 84532,
      verify: {
        etherscan: {
          apiUrl: "https://api-sepolia.basescan.org",
        },
      },
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: "2RTIWU4VFRGX8EYBBDVUM65DAWMKKPGTFT",
    },
  },
  sourcify: {
    enabled: true,
  },
};
