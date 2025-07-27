**Product Requirements Document (PRD)**

**Project:** Crypto Heist
**Component:** Smart Contract (Solidity - Monad Testnet)
**Goal:** Implement the on-chain logic for the Crypto Heist game

---

## 1. Overview

Crypto Heist is a real-time, team-based strategy game on the Monad Testnet. Players join a room as either Thieves or Police and attempt to either break into a crypto vault or prevent it. All gameplay logic and outcomes are recorded on-chain, including vault funding, round progression, move commitments, and prize distribution.

---

## 2. Core Concepts

### 2.1 Game Room

* Created by a user with a customizable entry fee (min 2 MON)
* Entry fee is not sent until game is started
* Game can only start if at least:

  * 3 Thieves
  * 3 Police
  * Max total players = 10
* Room creator can also play and select their team

### 2.2 Teams

* Players choose their own team (if not full)
* Nicknames:

  * Custom nickname allowed at join
  * If empty:

    * Thieves: default "John"
    * Police: random from \["Keone", "Bill", "Mike", "James"]

### 2.3 Vault / Prize Pool

* Entry fee from all players is pooled into a vault (only upon game start)
* Locked until game ends
* Winning players claim rewards on-chain

---

## 3. Game Lifecycle

### 3.1 Game Start

* Starts when creator clicks "Start" and team balance rules are satisfied
* Contract records start block to generate randomness for stage 4

### 3.2 Game Stages

* 4 total stages (rounds)

* In stages 1–3:

  * Each Thief selects a path (A, B, C) independently
  * Police team votes on 1 path to block (on-chain commit)
  * Any Thief who chooses the blocked path is eliminated
  * Others progress

* Stage 4:

  * Thieves again select paths independently
  * Police vote on 1 path to block
  * A random path is selected as the winning path using stored `startBlock`:

    ```solidity
    uint8 winningPath = uint8(uint256(blockhash(startBlock)) % 3); // 0,1,2
    ```
  * Surviving Thieves who chose the winning path = winners

### 3.3 Timeouts

* Each stage:

  * 20s for voting (off-chain with Multisynq)
  * 10s for on-chain submission (if >= 2/3 of team do not commit → team loses stage)
* 5s cooldown between stages

### 3.4 Game End

* Game ends immediately after stage 4 or if all Thieves are eliminated
* Creator can call `finalizeGame()` to trigger:

  * Verify result
  * Distribute vault to winners equally

---

## 4. Functions

### Admin Functions

* `createGame(uint256 entryFee)`
* `joinGame(uint256 gameId, string memory nickname, bool isThief)`
* `startGame(uint256 gameId)`

### Gameplay

* `commitMove(uint256 gameId, uint8 pathChoice)` // Thieves only
* `voteBlock(uint256 gameId, uint8 pathChoice)` // Police only
* `finalizeGame(uint256 gameId)`

### View Functions

* `getPlayers(uint256 gameId)`
* `getGameState(uint256 gameId)`
* `getVaultBalance(uint256 gameId)`

---

## 5. Storage Structures (Simplified)

```solidity
struct Player {
  address addr;
  string nickname;
  bool isThief;
  bool eliminated;
  uint8[4] moves;
}

struct GameRoom {
  uint256 id;
  address creator;
  uint256 entryFee;
  uint256 startBlock;
  bool started;
  bool finalized;
  Player[] players;
  uint256 vault;
  mapping(uint256 => uint8) policeVotes; // stage => path
  mapping(address => bool) winners;
}
```

---

## 6. Notes

* Game logic assumes off-chain vote sync with Multisynq and only final votes submitted on-chain
* All funds must be safely handled and stored until finalization
* Frontend/Convex will handle room listing, active player tracking, etc.

---

## 7. Future Improvements

* Add support for game replay or historical logs
* Add NFT mint for winners
* Extend to allow spectators or replays
