require('dotenv').config()
const { createPublicClient, http, createClient, createWalletClient, encodeFunctionData } = require('viem')
const { baseSepolia } = require('viem/chains')
const { generatePrivateKey } = require('viem/accounts')
const { getUsernameHash, generateProof, generateCredentialHash } = require('../src/utils')
const { createBundlerClient, toCoinbaseSmartAccount } = require('viem/account-abstraction')

// Creates a Coinbase smart wallet using an EOA signer
const registrant = generatePrivateKey()
console.log({
    registrant: registrant.address,
})

const vault = {
    address: process.env.VAULT_V2_ADDRESS,
    abi: require('../artifacts/contracts/VaultV2.sol/VaultV2.json').abi,
}

let account = null
let bundlerClient = null
let client = null
let walletClient = null

async function init(signer) {
    // Initialize the smart account
    client = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.COINBASE_API_KEY),
    })

    account = await toCoinbaseSmartAccount({
        client,
        owners: [signer],
    })

    const accountAddress = account.address
    console.log("Smart Account Address:", accountAddress)

    // Initialize the bundler client
    bundlerClient = createBundlerClient({
        account,
        client,
        transport: http(process.env.COINBASE_API_KEY),
        chain: baseSepolia,
    })

    walletClient = createWalletClient({
        account: signer,
        chain: baseSepolia,
        transport: http(process.env.COINBASE_API_KEY),
    })
}

async function register(username, password) {
    // Generate required hashes and proof
    const usernameHash = await getUsernameHash(username)
    const credentialHash = await generateCredentialHash(username, password)
    const proof = await generateProof(username, password)
    
    console.log("Username hash:", usernameHash)
    console.log("Credential hash:", credentialHash)

    // Format proof for contract call
    const formattedProof = {
        pi_a: proof.proof.pi_a.slice(0, 2),
        pi_b: [
            [proof.proof.pi_b[0][1], proof.proof.pi_b[0][0]],
            [proof.proof.pi_b[1][1], proof.proof.pi_b[1][0]]
        ],
        pi_c: proof.proof.pi_c.slice(0, 2)
    }

    // Create registration call
    const registerCall = {
        to: vault.address,
        data: encodeFunctionData({
            abi: vault.abi,
            functionName: 'register',
            args: [
                formattedProof.pi_a,
                formattedProof.pi_b,
                formattedProof.pi_c,
                usernameHash,
                credentialHash,
                proof.publicSignals[2], // nonce
                proof.publicSignals[3]  // result hash
            ],
        })
    }

    account.userOperation = {
        estimateGas: async (userOperation) => {
            console.log("Estimating gas for user operation:", userOperation)
            const estimate = await bundlerClient.estimateUserOperationGas(userOperation);
            console.log("Initial gas estimate:", estimate)
            
            // Adjust gas limits for complex transactions
            estimate.preVerificationGas = estimate.preVerificationGas * 3n;
            estimate.verificationGasLimit = estimate.verificationGasLimit * 2n;
            estimate.callGasLimit = estimate.callGasLimit * 2n;
            
            console.log("Adjusted gas estimate:", estimate)
            return estimate;
        },
    };

    try {
        const userOpHash = await bundlerClient.sendUserOperation({
            account,
            calls: [registerCall],
            paymaster: true
        })
      
        console.log("UserOperation Hash:", userOpHash)
        
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })
      
        console.log("✅ User registration successful!")
        console.log(`⛽ View sponsored UserOperation on blockscout: https://base-sepolia.blockscout.com/op/${receipt.userOpHash}`)
        console.log(`🔍 View transaction on basescan: https://sepolia.basescan.org/address/${account.address}`)
        process.exit(0)
    } catch (error) {
        console.error("Error during registration:", error)
        process.exit(1)
    }
}

async function main() {
    await init(registrant)
    await register("test", "1234")
}

main().catch(console.error) 