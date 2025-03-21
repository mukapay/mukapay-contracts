const snarkjs = require("snarkjs");
const crypto = require("crypto");
const circomlibjs = require("circomlibjs");
const fs = require("fs");
const { generateProof } = require("../src/utils");

// Generate Poseidon hash using snarkjs
async function poseidonHash(inputs) {
    const poseidon = await circomlibjs.buildPoseidon();
    return poseidon.F.toString(poseidon(inputs));
}

// Example usage of the imported generateProof function
async function main() {
    // Example values
    const username = "alice";
    const password = "password123";
    
    try {
        const { proof, publicSignals, input } = await generateProof(username, password);
        
        console.log("Input:", input);
        console.log("Proof generated successfully!");
        console.log("Public signals:", publicSignals);
        console.log("Proof:", proof);

        // Save proof to file
        fs.writeFileSync(
            "build/proofs/proof.json",
            JSON.stringify({ proof, publicSignals }, null, 2)
        );

        return { proof, publicSignals };
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

// If we're running this script directly
if (require.main === module) {
    main().then(() => {
        process.exit(0);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    main,
    poseidonHash
}; 