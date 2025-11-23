# Security Audit Report: PredictionV3.sol

**Contract**: `PredictionV3.sol` (PancakePredictionV2Pyth)
**Network**: Base Sepolia
**Audit Date**: 2025-01-23

---

## 🔴 CRITICAL ISSUES

### 1. **Division by Zero in Reward Calculation** (Line 275)
**Severity**: CRITICAL
**Location**: `claim()` function

```solidity
addedReward = (ledger[epochs[i]][msg.sender].amount * round.rewardAmount) / round.rewardBaseCalAmount;
```

**Issue**: If `round.rewardBaseCalAmount` is 0 (which happens when there's a tie), this will cause a division by zero revert.

**Impact**: Users cannot claim their rewards when there's a tie, funds get stuck.

**Fix**:
```solidity
if (round.rewardBaseCalAmount > 0) {
    addedReward = (ledger[epochs[i]][msg.sender].amount * round.rewardAmount) / round.rewardBaseCalAmount;
} else {
    // Handle tie case - should not happen for claimable rounds
    revert("Invalid reward calculation");
}
```

---

### 2. **Contract Name Mismatch** (Line 17)
**Severity**: MEDIUM
**Location**: Contract declaration

```solidity
contract PancakePredictionV2Pyth is Ownable, Pausable, ReentrancyGuard {
```

**Issue**: Contract is named `PancakePredictionV2Pyth` but file is `PredictionV3.sol`. This is confusing and suggests copy-paste from PancakeSwap's code.

**Impact**: Code maintainability, potential licensing issues, confusion.

**Fix**:
```solidity
contract PredictionV3 is Ownable, Pausable, ReentrancyGuard {
```

---

### 3. **Unchecked Oracle Staleness** (Line 845)
**Severity**: HIGH
**Location**: `_getPriceFromPyth()`

```solidity
PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceId, 20);
```

**Issue**: Hardcoded 20 seconds staleness check. On testnet, Pyth may not update this frequently. If no fresh price is available, transaction will revert, causing rounds to fail.

**Impact**: Rounds can get stuck if Pyth doesn't update within 20 seconds.

**Fix**:
```solidity
// Make staleness configurable
uint256 public maxPriceStaleness = 60; // 60 seconds default

PythStructs.Price memory pythPrice = pyth.getPriceNoOlderThan(priceId, maxPriceStaleness);
```

---

## 🟠 HIGH RISK ISSUES

### 4. **Missing Validation in Constructor**
**Severity**: HIGH
**Location**: Constructor (Line 160-182)

**Issues**:
- No validation that `_pythContract` is actually a valid Pyth contract
- No validation that `_priceId` exists in Pyth
- No check that `_intervalSeconds > _bufferSeconds`
- No check that addresses aren't zero (except treasury fee check)

**Fix**:
```solidity
constructor(...) {
    require(_pythContract != address(0), "Invalid Pyth address");
    require(_adminAddress != address(0), "Invalid admin address");
    require(_operatorAddress != address(0), "Invalid operator address");
    require(_intervalSeconds > _bufferSeconds, "Invalid interval/buffer");
    require(_treasuryFee <= MAX_TREASURY_FEE, "Treasury fee too high");
    require(_minBetAmount > 0, "Min bet must be > 0");

    // Try to validate Pyth contract
    pyth = IPyth(_pythContract);
    // Could add: pyth.getPriceNoOlderThan(priceId, type(uint256).max); // Test if priceId exists

    // ... rest of initialization
}
```

---

### 5. **Reentrancy Risk in ETH Transfer** (Line 814)
**Severity**: MEDIUM-HIGH
**Location**: `_safeTransferETH()`

```solidity
function _safeTransferETH(address to, uint256 value) internal {
    (bool success, ) = to.call{value: value}("");
    require(success, "TransferHelper: ETH_TRANSFER_FAILED");
}
```

**Issue**: Uses `.call{value}` which forwards all gas and can trigger fallback functions. While `nonReentrant` is used, the order of operations in `claim()` could still be problematic.

**Current order in claim()** (Line 250-293):
1. Loop through epochs
2. Calculate rewards
3. Mark as claimed (Line 284)
4. Transfer ETH (Line 291)

**Issue**: If any epoch in the array fails, previous epochs are already marked as claimed but ETH hasn't been transferred yet.

**Fix**: Use Checks-Effects-Interactions pattern more strictly:
```solidity
function claim(uint256[] calldata epochs) external nonReentrant notContract {
    uint256 reward;

    // CHECKS & EFFECTS first
    for (uint256 i = 0; i < epochs.length; i++) {
        // ... all checks ...

        uint256 addedReward = 0;

        if (rounds[epochs[i]].oracleCalled) {
            require(claimable(epochs[i], msg.sender), "Not eligible for claim");
            Round memory round = rounds[epochs[i]];

            // Check for division by zero
            require(round.rewardBaseCalAmount > 0, "Invalid reward calculation");

            addedReward = (ledger[epochs[i]][msg.sender].amount * round.rewardAmount) / round.rewardBaseCalAmount;
        } else {
            require(refundable(epochs[i], msg.sender), "Not eligible for refund");
            addedReward = ledger[epochs[i]][msg.sender].amount;
        }

        // EFFECT: Mark as claimed BEFORE calculating total
        ledger[epochs[i]][msg.sender].claimed = true;
        reward += addedReward;

        emit Claim(msg.sender, epochs[i], addedReward);
    }

    // INTERACTION: Transfer AFTER all state changes
    if (reward > 0) {
        _safeTransferETH(address(msg.sender), reward);
    }
}
```

---

### 6. **performUpkeep() Has No Access Control**
**Severity**: MEDIUM-HIGH
**Location**: `performUpkeep()` (Line 399)

```solidity
function performUpkeep() external {
    require(!paused(), "Contract is paused");
```

**Issue**: Anyone can call `performUpkeep()`. While it has timing restrictions, a malicious actor could front-run or spam calls to this function, potentially causing DoS or unexpected behavior.

**Impact**:
- Gas griefing attacks
- Race conditions with legitimate keeper calls
- Potential for timing manipulation

**Fix**: Add access control or use Chainlink's `checkUpkeep/performUpkeep` pattern:
```solidity
function performUpkeep(bytes calldata /* performData */) external {
    require(!paused(), "Contract is paused");
    require(msg.sender == operatorAddress || isApprovedKeeper[msg.sender], "Not authorized");

    // ... rest of function
}

// Or use Chainlink's AutomationCompatible interface
function checkUpkeep(bytes calldata /* checkData */) external view returns (bool upkeepNeeded, bytes memory /* performData */) {
    // Check if upkeep is needed
    upkeepNeeded = !paused() && shouldExecuteRound();
}
```

---

## 🟡 MEDIUM RISK ISSUES

### 7. **Timestamp Dependence**
**Severity**: MEDIUM
**Location**: Multiple locations using `block.timestamp`

**Issue**: The contract relies heavily on `block.timestamp` which can be manipulated by miners by ±15 seconds.

**Locations**:
- Line 261: `block.timestamp > rounds[epochs[i]].closeTimestamp`
- Line 428: `block.timestamp > rounds[currentEpoch].lockTimestamp - 5`
- Line 726: `block.timestamp >= rounds[epoch].lockTimestamp - 5`
- Line 799-801: Round timing calculations

**Impact**: Miners could slightly manipulate round timing to their advantage.

**Mitigation**:
- Use longer buffer periods (current bufferSeconds helps)
- Accept that ±15 seconds is acceptable for the use case
- Document this risk

---

### 8. **Missing Zero-Price Validation**
**Severity**: MEDIUM
**Location**: `_getPriceFromPyth()` (Line 856)

```solidity
require(price > 0, "Invalid price from Pyth");
```

**Issue**: Only checks if price is positive, but doesn't check for extremely low prices that might indicate an oracle failure.

**Fix**:
```solidity
require(price > 0, "Invalid price from Pyth");
require(price < type(int256).max / 2, "Price overflow risk"); // Sanity check
```

---

### 9. **No Emergency Withdrawal**
**Severity**: MEDIUM
**Location**: Contract-wide

**Issue**: If rounds get permanently stuck (oracle failure, bugs, etc.), there's no way for users to withdraw their funds.

**Fix**: Add emergency withdrawal after a timeout:
```solidity
function emergencyWithdraw(uint256 epoch) external nonReentrant {
    require(block.timestamp > rounds[epoch].closeTimestamp + 7 days, "Too early for emergency withdrawal");
    require(!rounds[epoch].oracleCalled, "Round already settled");
    require(ledger[epoch][msg.sender].amount > 0, "No bet to withdraw");
    require(!ledger[epoch][msg.sender].claimed, "Already claimed");

    uint256 amount = ledger[epoch][msg.sender].amount;
    ledger[epoch][msg.sender].claimed = true;

    _safeTransferETH(msg.sender, amount);

    emit EmergencyWithdraw(msg.sender, epoch, amount);
}
```

---

### 10. **Array Length Not Validated in claim()**
**Severity**: MEDIUM
**Location**: `claim()` (Line 250)

```solidity
function claim(uint256[] calldata epochs) external nonReentrant notContract {
    uint256 reward;

    for (uint256 i = 0; i < epochs.length; i++) {
```

**Issue**: No limit on array length. Could cause out-of-gas errors or be used for DoS.

**Fix**:
```solidity
function claim(uint256[] calldata epochs) external nonReentrant notContract {
    require(epochs.length > 0, "Empty array");
    require(epochs.length <= 50, "Too many epochs"); // Reasonable limit

    uint256 reward;
    // ... rest of function
}
```

---

## 🟢 LOW RISK / CODE QUALITY ISSUES

### 11. **Inefficient Storage Reads**
**Severity**: LOW
**Location**: Multiple functions

**Issue**: Multiple SLOAD operations on the same storage variables.

**Example** (Line 272-275):
```solidity
Round memory round = rounds[epochs[i]];
addedReward = (ledger[epochs[i]][msg.sender].amount * round.rewardAmount) / round.rewardBaseCalAmount;
```

**Fix**: Load once, use memory:
```solidity
BetInfo memory betInfo = ledger[epochs[i]][msg.sender];
Round memory round = rounds[epochs[i]];
addedReward = (betInfo.amount * round.rewardAmount) / round.rewardBaseCalAmount;
```

---

### 12. **No Events for Important State Changes**
**Severity**: LOW
**Location**: Various

**Missing events for**:
- `oracleLatestTimestamp` updates
- Buffer/interval changes could emit in constructor

---

### 13. **Magic Numbers**
**Severity**: LOW
**Location**: Multiple

**Examples**:
- Line 428, 759, 726: `-5` (5 seconds buffer)
- Line 845: `20` (price staleness in seconds)
- Line 684, 690: `10000` (basis points denominator)

**Fix**: Define as constants:
```solidity
uint256 constant EXECUTION_BUFFER_SECONDS = 5;
uint256 constant BASIS_POINTS = 10000;
```

---

### 14. **Unused Event Parameters**
**Severity**: INFORMATIONAL
**Location**: Line 101, 102

```solidity
event NewMinBetAmount(uint256 indexed epoch, uint256 minBetAmount);
event NewTreasuryFee(uint256 indexed epoch, uint256 treasuryFee);
```

**Issue**: `epoch` parameter is emitted but these changes happen when paused, so current epoch might not be relevant.

---

### 15. **Potential for Round Gaps**
**Severity**: LOW
**Location**: `_safeStartRound()` (Line 777)

**Issue**: If `performUpkeep()` is not called reliably, rounds could have gaps.

**Mitigation**: Ensure reliable keeper setup (Chainlink Automation, Gelato, etc.)

---

## 📊 SUMMARY

| Severity | Count | Issues |
|----------|-------|---------|
| 🔴 Critical | 3 | Division by zero, Contract name mismatch, Oracle staleness |
| 🟠 High | 3 | Missing validations, Reentrancy risk, No access control on performUpkeep |
| 🟡 Medium | 5 | Timestamp dependence, Zero-price validation, No emergency withdrawal, Array length, etc. |
| 🟢 Low | 5 | Code quality, gas optimization, events |

**Total Issues**: 16

---

## 🛠️ RECOMMENDATIONS

### Immediate (Before Mainnet):
1. ✅ Fix division by zero in claim()
2. ✅ Add constructor parameter validation
3. ✅ Make oracle staleness configurable
4. ✅ Add access control to performUpkeep()
5. ✅ Rename contract to match filename
6. ✅ Add emergency withdrawal mechanism

### Important (Before Large TVL):
7. ✅ Add array length validation in claim()
8. ✅ Improve reentrancy protection order
9. ✅ Add sanity checks on oracle prices
10. ✅ Add more comprehensive events

### Nice to Have:
11. ✅ Gas optimizations (storage reads)
12. ✅ Replace magic numbers with constants
13. ✅ Add more detailed documentation
14. ✅ Consider upgradeable pattern

---

## 🔒 SECURITY BEST PRACTICES FOLLOWED

✅ Uses OpenZeppelin contracts
✅ Has ReentrancyGuard on critical functions
✅ Has Pausable emergency stop
✅ Has access control (Ownable, admin, operator)
✅ Validates minimum bet amounts
✅ Uses SafeERC20 for token operations
✅ No floating pragma (uses `^0.8.0`)
✅ Has treasury fee limits

---

## 📝 NOTES

1. **Pyth Oracle Integration**: Contract uses Pyth's push model correctly but needs better staleness handling for testnet compatibility.

2. **Testnet vs Mainnet**: Current hardcoded 20-second staleness is too strict for testnets. Make this configurable.

3. **Keeper Reliability**: Contract heavily depends on `performUpkeep()` being called reliably. Ensure proper Chainlink Automation or equivalent.

4. **Gas Costs**: Batch claim can be expensive. Users should be aware of gas costs when claiming multiple rounds.

---

**Auditor Notes**: This contract is generally well-structured and follows security best practices, but has several critical issues that must be fixed before production deployment, especially the division by zero vulnerability and access control on `performUpkeep()`.
