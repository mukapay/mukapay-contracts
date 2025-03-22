const fs = require("fs");
const { generateProof, generateCredentialHash, getUsernameHash } = require("../src/utils");

// Example usage of the imported generateProof function
async function main() {
    // Example values
    const username = "bukamuka";
    const correctPassword = "mukakamu";
    const amount = 100_000_000n
    const toUsername = "yongfeng"
    
    try {
        // Generate proof with correct password
        console.log("\n=== Authentication with Correct Password ===");
        const proof = await generateProof(username, correctPassword);
        console.log(JSON.stringify({
            proof,
            toUsernameHash: await getUsernameHash(toUsername),
            amount: amount.toString()
        }))
        // Save successful proof to file
        // fs.writeFileSync(
        //     "circuits/proof.json",
        //     JSON.stringify(correctAttempt)
        // );
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

main().catch(console.error).then(() => {
    process.exit(0);
});