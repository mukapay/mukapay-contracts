const fs = require("fs");
const { generateProof, generateCredentialHash, getUsernameHash } = require("../src/utils");

// Example usage of the imported generateProof function
async function main() {
    // Example values
    const username = "bukamuka";
    const correctPassword = "mukakamu";
    const amount = 1_000_000n // for both withdraw and payment
    const toUsername = "yikkai" //for payment
    const toUserAddress = "0x261914D11434Becc57dE7BBE8C82551B648E510f" //for withdraw
    
    try {
        // Generate proof with correct password
        console.log("\n=== Authentication with Correct Password ===");
        const proof = await generateProof(username, correctPassword);
        console.log(JSON.stringify({
            proof,
            to_username_hash: await getUsernameHash(toUsername),
            to_user_address: toUserAddress,
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