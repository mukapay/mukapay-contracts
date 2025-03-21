require('dotenv').config()
const { createPublicClient, http, createClient, createWalletClient, encodeFunctionData } = require('viem')
const { baseSepolia } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')
const { getUsernameHash } = require('../src/utils')
const { createBundlerClient, toCoinbaseSmartAccount } = require('viem/account-abstraction')

// Creates a Coinbase smart wallet using an EOA signer
const deployer = privateKeyToAccount("0x" + process.env.PRIVATE_KEY)
const depositor = privateKeyToAccount(process.env.DEPOSITOR_ADDRESS)
console.log({
    deployer: deployer.address,
    depositor: depositor.address,
})

const mockUSDC = {
    address: process.env.USDC_ADDRESS,
    abi: require('../artifacts/contracts/MockUSDC.sol/MockUSDC.json').abi,
}

const vault = {
    address: process.env.VAULT_ADDRESS,
    abi: require('../artifacts/contracts/Vault.sol/Vault.json').abi,
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

async function mintUsdc(to, amount) {
    const hash = await walletClient.writeContract({
        address: mockUSDC.address,
        abi: mockUSDC.abi,
        functionName: 'mint',
        args: [to, amount],
        account: deployer
    })
    return hash
}

async function deposit(username, amount) {
    const usernameHash = await getUsernameHash(username)
    console.log("Username hash:", usernameHash)
    // First approve USDC spending
    const approveCall = {
        to: mockUSDC.address,
        data: encodeFunctionData({
            address: mockUSDC.address,
            abi: mockUSDC.abi,
            functionName: 'approve',
            args: [vault.address, amount],
        }),
    }

    const depositCall = {
        to: vault.address,
        data: encodeFunctionData({
            abi: vault.abi,
            functionName: 'deposit',
            args: [usernameHash, amount],
        })
    }

    const calls = [approveCall, depositCall]

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
            calls,
            paymaster: true
        })
      
        console.log("UserOperation Hash:", userOpHash)
        
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })
      
        console.log("✅ Transaction successfully sponsored!")
        console.log(`⛽ View sponsored UserOperation on blockscout: https://base-sepolia.blockscout.com/op/${receipt.userOpHash}`)
        console.log(`🔍 View transaction on basescan: https://sepolia.basescan.org/address/${account.address}`)
        process.exit(0)
    } catch (error) {
        console.error("Error sending transaction:", error)
        process.exit(1)
    }
}

async function main() {
    await init(depositor)
    // const account = await toCoinbaseSmartAccount({client, owners: [depositor]})
    // const hash = await mintUsdc(account.address, 1_000_000n)
    // console.log("Mint hash:", hash)
    await deposit("bukamuka", 1_000_000n)
}

main().catch(console.error)