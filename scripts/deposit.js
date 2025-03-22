require('dotenv').config()
const { createPublicClient, http, createClient, createWalletClient, encodeFunctionData, parseEther } = require('viem')
const { baseSepolia } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')
const { getUsernameHash } = require('../src/utils')
const { createBundlerClient, toCoinbaseSmartAccount } = require('viem/account-abstraction')

// Creates a Coinbase smart wallet using an EOA signer
const deployer = privateKeyToAccount(process.env.PRIVATE_KEY)
const signer = deployer
const rpc_url = process.env.BASE_API_KEY
console.log({
    deployer: deployer.address,
})

const mockUSDC = {
    address: process.env.USDC_ADDRESS,
    abi: require('../artifacts/contracts/MockUSDC.sol/MockUSDC.json').abi,
}

const vault = {
    address: process.env.VAULT_ADDRESS,
    abi: require('../artifacts/contracts/Vault.sol/Vault.json').abi,
}

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpc_url),
})
const walletClient = createWalletClient({
    account: signer,
    chain: baseSepolia,
    transport: http(rpc_url),
})

async function mintUsdc(to, amount) {
    const hash = await walletClient.writeContract({
        address: mockUSDC.address,
        abi: mockUSDC.abi,
        functionName: 'mint',
        args: [to, amount],
        account: signer
    })
    return hash
}

async function balance(address) {
    const balance = await client.readContract({
        address: mockUSDC.address,
        abi: mockUSDC.abi,
        functionName: 'balanceOf',
        args: [address]
    })
    return balance
}

async function deposit(username, amount) {
    const usernameHash = await getUsernameHash(username)
    console.log("Username hash:", usernameHash)
    // First approve USDC spending

    const approveHash = await walletClient.writeContract({
        address: mockUSDC.address,
        abi: mockUSDC.abi,
        functionName: 'approve',
        args: [vault.address, amount],
        account: signer
    })

    console.log("Approve hash:", approveHash)

    const depositHash = await walletClient.writeContract({
        address: vault.address,
        abi: vault.abi,
        functionName: 'deposit',
        args: [usernameHash, amount],
        account: signer,
    })

    console.log("Deposit hash:", depositHash)

}

async function sendEth(to, amount) {
    const hash = await walletClient.sendTransaction({
        to: to,
        value: amount,
        account: signer
    })
    return hash
}

async function vaultBalanceOf(username) {
    const usernameHash = await getUsernameHash(username)
    const balance = await client.readContract({
        address: process.env.VAULT_ADDRESS,
        functionName: 'balances',
        abi: vault.abi,
        args: [usernameHash]
      })
    return balance
  
  
}

async function main() {
    // const hash = await mintUsdc(signer.address, 100_000_000n)
    // console.log("Hash:", hash)
    // console.log(await balance(signer.address))
    // const amount = parseEther("0.01")
    // console.log("Amount:", amount)
    // const hash = await sendEth(depositor.address, amount)
    // console.log("Hash:", hash)
    // console.log(await vaultBalanceOf("bukamuka"))
    // await deposit("bukamuka", 100_000_000n)
    // console.log(await vaultBalanceOf("bukamuka"))

}

main().catch(console.error)