# MukaPay Smart Contracts

This project contains the smart contracts for MukaPay, a privacy-preserving payment system using zero-knowledge proofs.

## Deployed Contracts (Base Sepolia)

The following contracts are deployed on Base Sepolia testnet:

| Contract | Address | Description |
|----------|---------|-------------|
| Vault | [`0xB4f7dF8d5ec4C61fF41040230fCF23d167220741`](https://sepolia.basescan.org/address/0xB4f7dF8d5ec4C61fF41040230fCF23d167220741) | Main contract for handling deposits and payments |
| Verifier | [`0x55AE1Ba114ef202d92de37782083AF363A40A04C`](https://sepolia.basescan.org/address/0x55AE1Ba114ef202d92de37782083AF363A40A04C) | ZK proof verification contract |
| MockUSDC | [`0x0a6CC1B2cB197AA6a6878fee28Fd1c908B603ad4`](https://sepolia.basescan.org/address/0x0a6CC1B2cB197AA6a6878fee28Fd1c908B603ad4) | Test USDC token for development |


USDC: 0x0a6CC1B2cB197AA6a6878fee28Fd1c908B603ad4
Verifier: 0xBE3a42c6D4e822c093Cabe4fC057162F80138BdB
Vault: 0x489aD83e3Ba281958De9eE61797a92A10cEB6caA

Last updated: March 21, 2024

## Project Structure

- `contracts/`: Smart contract source files
  - `Vault.sol`: Main contract for handling deposits and payments
  - `verifier.sol`: Auto-generated ZK proof verification contract
  - `MockUSDC.sol`: Test USDC token implementation
- `test/`: Contract test files
- `scripts/`: Deployment and interaction scripts

## Development

### Prerequisites

- Node.js
- npm or yarn
- Hardhat

### Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file with the following variables:
```
PRIVATE_KEY=your_private_key_here
BASE_API_KEY=your_base_rpc_url_here
```

### Testing

Run the test suite:
```bash
npx hardhat test
```

### Deployment

Deploy to Base Sepolia:
```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

## License

MIT
