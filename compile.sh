#!/bin/bash

# Install dependencies if not already installed
# echo "Installing dependencies..."
# npm install circomlib
# npm install -g snarkjs

# # Compile the circuit
echo "Compiling circuit..."
cd circuits
circom circuit.circom --r1cs --wasm

Generate Powers of Tau
echo "Generating Powers of Tau..."
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Generate zkey
echo "Generating zkey..."
snarkjs groth16 setup circuit.r1cs pot12_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="1st Contributor" -v

# Export verification key
echo "Exporting verification key..."
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

# Generate Solidity verifier
echo "Generating Solidity verifier..."
snarkjs zkey export solidityverifier circuit_final.zkey ../contracts/verifier.sol

# Clean up temporary files
echo "Cleaning up temporary files..."
rm pot12_0000.ptau pot12_0001.ptau circuit_0000.zkey