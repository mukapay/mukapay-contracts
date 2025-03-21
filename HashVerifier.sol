// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HashVerifier {
    // Mapping to track used nonces for each username hash
    mapping(uint256 => mapping(uint256 => bool)) public usedNonces;
    
    // Mapping to store result hashes for each username
    mapping(uint256 => uint256) public resultHashes;
    
    // The Verifier contract will be generated by snarkjs/circom
    IVerifier public verifier;
    
    event UsernameRegistered(uint256 indexed usernameHash, uint256 resultHash);
    event ProofVerified(uint256 indexed usernameHash, uint256 nonce);
    
    constructor(address _verifierAddress) {
        verifier = IVerifier(_verifierAddress);
    }
    
    // Register a new username with its result hash
    function register(uint256 usernameHash, uint256 resultHash) external {
        require(resultHashes[usernameHash] == 0, "Username already registered");
        resultHashes[usernameHash] = resultHash;
        emit UsernameRegistered(usernameHash, resultHash);
    }
    
    // Verify ownership using ZK proof
    function verify(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 usernameHash,
        uint256 nonce
    ) external returns (bool) {
        require(!usedNonces[usernameHash][nonce], "Nonce already used");
        require(resultHashes[usernameHash] != 0, "Username not registered");
        
        // Verify the proof
        uint256[] memory publicInputs = new uint256[](3);
        publicInputs[0] = usernameHash;
        publicInputs[1] = nonce;
        publicInputs[2] = resultHashes[usernameHash];
        
        require(verifier.verifyProof(a, b, c, publicInputs), "Invalid proof");
        
        // Mark nonce as used
        usedNonces[usernameHash][nonce] = true;
        
        emit ProofVerified(usernameHash, nonce);
        return true;
    }
}

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) external view returns (bool);
} 