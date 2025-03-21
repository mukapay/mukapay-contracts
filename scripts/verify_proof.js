const fs = require("fs");
const { verifyProof } = require("../src/utils");

async function main() {
    try {
        // Read the proof and public signals from proof.json
        const { proof, publicSignals } = JSON.parse(
            fs.readFileSync("build/proofs/proof.json", "utf8")
        );

        // Read the verification key
        const verificationKey = JSON.parse(
            fs.readFileSync("build/keys/verification_key.json", "utf8")
        );

        // Verify the proof using the imported verifyProof function
        const verified = await verifyProof(proof, publicSignals, verificationKey);

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
    main()
        .then((result) => {
            process.exit(result ? 0 : 1);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { main }; 