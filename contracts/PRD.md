**Product Requirements Document (PRD)**

**Project:** MonkaBreak
**Component:** Smart Contract (Solidity - Monad Testnet)
**Goal:** Minimal on-chain logic to handle game funding, starting, and reward distribution

---

## 1. Overview

MonkaBreak is a real-time team-based strategy game where players compete as Thieves and Police. The smart contract is designed to handle only essential on-chain logic:

* Game creation and unique ID registration
* Game starting with MON deposit into a vault
* Finalization and distribution of prize vault to winners
  All other game logic (player states, moves, stage control) is handled off-chain using Convex and frontend logic.

---

## 2. Responsibilities

### ✅ Handled by Contract

* Registering a new game room with a unique ID and creator
* Receiving and locking the entry fee when the game starts
* Recording the block number at game start for randomness
* Finalizing the game and distributing the vault to a given list of winners

### ❌ Not Handled by Contract

* Player registration and roles
* Team assignment (Thief or Police)
* Voting and move validation per stage
* Round progression logic
* Nickname management
* Game logic timing (Multisynq and frontend handle this)

---

## 3. Contract Functions

### Game Lifecycle

* `createGame(uint256 gameId)`

  * Creates a new game with `msg.sender` as creator
  * No funds are sent yet

* `startGame(uint256 gameId)` **payable**

  * Can only be called by creator
  * Requires `msg.value` to be greater than or equal to minimum (2 MON)
  * Saves `entryFee`, `vault`, and current block as `startBlock`
  * Marks game as started

* `finalizeGame(uint256 gameId, address[] calldata winners)`

  * Can only be called by creator
  * Can only be called once
  * Splits the vault evenly among provided `winners`
  * Rejects if no winners or game not started

### View Functions

* `getGame(uint256 gameId)`

  * Returns public game data: creator, vault, started, finalized, entryFee, startBlock

---

## 4. Storage Structures (Simplified)

```solidity
struct Game {
  address creator;
  uint256 vault;
  uint256 entryFee;
  uint256 startBlock;
  bool started;
  bool finalized;
}

mapping(uint256 => Game) public games;
```

---

## 5. Events

* `GameCreated(uint256 gameId, address creator)`
* `GameStarted(uint256 gameId, uint256 vault, uint256 blockNumber)`
* `GameFinalized(uint256 gameId, address[] winners)`

---

## 6. Notes

* The `entryFee` is not set during game creation, only at start time via payable function
* Vault is locked on-chain and only distributed after a successful finalize call
* The off-chain system (Convex + frontend) must validate stages, player status, and provide winner addresses
* `gameId` must be unique and generated off-chain (e.g., by frontend)

---

## 7. Future Improvements

* Add pause/emergency functions for admin
* Add claimable reward mechanism instead of direct transfers
* Optional: log game metadata or hashes of off-chain game data for replay verification
