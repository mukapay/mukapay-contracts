const fs = require("fs");
const { generateProof, generateCredentialHash } = require("../src/utils");

// Example usage of the imported generateProof function
async function main() {
    // Example values
    const username = "alice";
    const correctPassword = "password123";
    
    try {
        // First, simulate registration by generating and storing credential hash
        console.log("\n=== User Registration Simulation ===");
        const storedCredentialHash = await generateCredentialHash(username, correctPassword);
        console.log("Stored credential hash:", storedCredentialHash);

        // Generate proof with correct password
        console.log("\n=== Authentication with Correct Password ===");
        const correctAttempt = await generateProof(username, correctPassword);
        
        console.log("Input used:", correctAttempt.input);
        console.log("Generated credential hash matches stored hash:", 
            correctAttempt.input.credential_hash === storedCredentialHash);
        console.log("Proof generated successfully!");

        // Save successful proof to file
        fs.writeFileSync(
            "circuits/proof.json",
            JSON.stringify({
                proof: correctAttempt.proof,
                publicSignals: correctAttempt.publicSignals,
                storedCredentialHash
            }, null, 2)
        );

        return {
            proof: correctAttempt.proof,
            publicSignals: correctAttempt.publicSignals,
            storedCredentialHash
        };
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

main().catch(console.error).then(() => {
    process.exit(0);
});