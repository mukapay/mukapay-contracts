const snarkjs = require("snarkjs");
const fs = require("fs");

async function verifyProof() {
    try {
        // Read the proof and public signals from proof.json
        const { proof, publicSignals } = JSON.parse(
            fs.readFileSync("proof.json", "utf8")
        );

        // Verify the proof
        const vKey = JSON.parse(
            fs.readFileSync("verification_key.json", "utf8")
        );

        // Verify the proof using snarkjs
        const verified = await snarkjs.groth16.verify(
            vKey,
            publicSignals,
            proof
        );

        console.log("Public Signals:", publicSignals);
        console.log("Verification result:", verified);
        
        return verified;
    } catch (err) {
        console.error("Error during verification:", err);
        if (err.message.includes("proof.json")) {
            console.error("Make sure to generate a proof first using generate_proof.js");
        }
        return false;
    }
}

// Run verification if this script is called directly
if (require.main === module) {
    verifyProof()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { verifyProof }; 