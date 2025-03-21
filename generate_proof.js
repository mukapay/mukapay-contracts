const snarkjs = require("snarkjs");
const crypto = require("crypto");
const circomlibjs = require("circomlibjs");
const fs = require("fs");


// Generate Poseidon hash using snarkjs
async function poseidonHash(inputs) {
    const poseidon = await circomlibjs.buildPoseidon();
    return poseidon.F.toString(poseidon(inputs));
}

async function generateProof() {
    // Initialize Poseidon
    const poseidon = await circomlibjs.buildPoseidon();

    // Example values
    const username = "alice";
    const password = "password123";
    const nonce = Date.now();

    // Convert string to field element using bytes
    function strToField(str) {
        const bytes = Buffer.from(str);
        let result = 0n;
        for (let i = 0; i < bytes.length; i++) {
            result = (result << 8n) + BigInt(bytes[i]);
        }
        return result;
    }

    // Convert inputs to field elements
    const usernameField = strToField(username);
    const passwordField = strToField(password);

    // Generate Poseidon hashes
    const usernameHash = poseidon([usernameField]);
    const passwordHash = poseidon([passwordField]);

    // Create input for the circuit
    const input = {
        password_hash: poseidon.F.toString(passwordHash),
        username_hash: poseidon.F.toString(usernameHash),
        nonce: nonce.toString(),
        result_hash: poseidon.F.toString(poseidon([passwordHash, usernameHash, BigInt(nonce)]))
    };

    console.log("Input:", input);

    // Generate the proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "circuit_js/circuit.wasm",
        "circuit_final.zkey"
    );

    console.log("Proof generated successfully!");
    console.log("Public signals:", publicSignals);
    console.log("Proof:", proof);

    // Save proof to file
    fs.writeFileSync(
        "proof.json",
        JSON.stringify({ proof, publicSignals }, null, 2)
    );

    return { proof, publicSignals };
}

// If we're running this script directly
if (require.main === module) {
    generateProof().then(() => {
        process.exit(0);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    generateProof,
    poseidonHash
}; 