pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template HashVerification() {
    // Private input: password hash (Poseidon hash)
    signal input password_hash;
    
    // Public inputs
    signal input username_hash; // Poseidon hash of username
    signal input nonce;        // Nonce to prevent replay attacks
    signal input result_hash;  // Expected hash result
    
    // Hash the password_hash, username_hash, and nonce together using Poseidon
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== password_hash;
    poseidon.inputs[1] <== username_hash;
    poseidon.inputs[2] <== nonce;
    
    // Verify the hash matches the expected result
    poseidon.out === result_hash;
}

component main { public [username_hash, nonce, result_hash] } = HashVerification(); 