pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template HashVerification() {
    // Private inputs
    signal input password;  // Now we take the actual password, not its hash
    signal input username;
    
    // Public inputs
    signal input username_hash;    // Poseidon hash of username
    signal input credential_hash;  // Stored hash of username+password
    signal input nonce;           // Nonce to prevent replay attacks
    signal input result_hash;     // Expected hash result
    
    // First verify that username_hash matches the hash of provided username
    component usernameHasher = Poseidon(1);
    usernameHasher.inputs[0] <== username;
    usernameHasher.out === username_hash;
    
    // Create and verify credential hash (username + password)
    component credentialHasher = Poseidon(2);
    credentialHasher.inputs[0] <== username;
    credentialHasher.inputs[1] <== password;
    credentialHasher.out === credential_hash;  // Verify against stored credential hash
    
    // Hash the credential_hash with nonce for the final verification
    component finalHasher = Poseidon(2);
    finalHasher.inputs[0] <== credential_hash;
    finalHasher.inputs[1] <== nonce;
    
    // Verify the final hash matches the expected result
    finalHasher.out === result_hash;
}

component main { public [username_hash, credential_hash, nonce, result_hash] } = HashVerification(); 