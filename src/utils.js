const snarkjs = require("snarkjs");
const circomlibjs = require("circomlibjs");

// Convert string to field element
function strToField(str) {
    const bytes = Buffer.from(str);
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
        result = (result << 8n) + BigInt(bytes[i]);
    }
    return result;
}

// Generate credential hash for a username and password
async function generateCredentialHash(username, password) {
    const poseidon = await circomlibjs.buildPoseidon();
    const usernameField = strToField(username);
    const passwordField = strToField(password);
    const credentialHash = poseidon([usernameField, passwordField]);
    return poseidon.F.toString(credentialHash);
}

// Generate proof with actual inputs
async function generateProof(username, password, nonce = Date.now()) {
    // Initialize Poseidon
    const poseidon = await circomlibjs.buildPoseidon();

    // Convert inputs to field elements
    const usernameField = strToField(username);
    const passwordField = strToField(password);

    // Generate Poseidon hashes
    const usernameHash = poseidon([usernameField]);
    const credentialHash = poseidon([usernameField, passwordField]);

    // Create final hash with credential hash and nonce
    const finalHash = poseidon([credentialHash, BigInt(nonce)]);

    // Create input for the circuit
    const input = {
        username: usernameField.toString(),
        password: passwordField.toString(),
        username_hash: poseidon.F.toString(usernameHash),
        credential_hash: poseidon.F.toString(credentialHash),
        nonce: nonce.toString(),
        result_hash: poseidon.F.toString(finalHash)
    };

    // Generate the proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "circuits/circuit_js/circuit.wasm",
        "circuits/circuit_final.zkey"
    );

    return { 
        proof, 
        publicSignals,
        input,
    };
}

// Verify a zero-knowledge proof
async function verifyProof(proof, publicSignals, verificationKey) {
    try {
        // Verify the proof using snarkjs
        const verified = await snarkjs.groth16.verify(
            verificationKey,
            publicSignals,
            proof
        );
        
        return verified;
    } catch (err) {
        console.error("Error during verification:", err);
        return false;
    }
}

async function generateCalldata(proof, publicSignals) {
    try {
        const solidityCalldata = await snarkjs.groth16.exportSolidityCallData(
            proof,
            publicSignals
        );

        return solidityCalldata;
    } catch (err) {
        console.error("Error generating Solidity calldata:", err);
        throw err;
    }
}

async function getUsernameHash(username) {
    // Initialize Poseidon
    const poseidon = await circomlibjs.buildPoseidon();

    // Convert username to field element
    const usernameField = strToField(username);

    // Generate Poseidon hash
    const usernameHash = poseidon([usernameField]);

    // Return the hash as a string
    return poseidon.F.toString(usernameHash);
}

module.exports = {
    generateProof,
    verifyProof,
    strToField,
    generateCalldata,
    getUsernameHash,
    generateCredentialHash
}; 