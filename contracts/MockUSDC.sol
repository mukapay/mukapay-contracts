// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private immutable _decimals;

    constructor() ERC20("USD Coin", "USDC") {
        _decimals = 6; // USDC uses 6 decimals
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Function to mint tokens (for testing purposes)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 