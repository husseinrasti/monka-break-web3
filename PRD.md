**Product Requirements Document (PRD)**

**Project:** MonkaBreak
**Component:** App (Frontend + Convex + Multisynq + viem)
**Goal:** Build a real-time, team-based crypto strategy game interface powered by Monad smart contracts, using Multisynq and Convex for state management.

---

## 1. Overview

MonkaBreak is a real-time multiplayer crypto game where players join rooms as Thieves or Police. The contract only manages on-chain funds, game start, and reward distribution. All player logic, game stages, team behavior, and decisions are handled off-chain (Convex + frontend).

---

## 2. Stack

* **Frontend Framework:** Next.js + ShadCN + TailwindCSS
* **Wallets:** viem (MetaMask, Phantom, WalletConnect, etc.)
* **Realtime Engine:** Multisynq
* **Backend State & DB:** Convex
* **Smart Contract:** Deployed on Monad Testnet at `0x7DdD1840B0130e7D0357f130Db52Ad1c6A833dbd`

---

## 3. Config (From Convex)

All game logic values are pulled dynamically from server config. Defaults:

```ts
{
  minThieves: 1,
  minPolice: 1,
  minPlayersToStart: 2,
  maxTotalPlayers: 10,
  entryFeeMinimum: 2,
  stageCount: 4,
  pathsPerStage: 3,
  timings: {
    voteDuration: 20,
    commitDuration: 10,
    cooldown: 5
  },
  defaultThiefName: "John",
  defaultPoliceNames: ["Keone", "Bill", "Mike", "James"],
  allowUnevenTeams: true
}
```

---

## 4. Game Flow

### Create Room

* User selects nickname (optional) and team
* No entryFee entered
* Convex stores game room and creator

### Join Room

* User joins with nickname (optional) and chooses team if space allows
* If no nickname provided:

  * Thieves: "John"
  * Police: random from list

### Start Game (by creator)

* Button opens modal to input entryFee (≥ entryFeeMinimum)
* Calls `startGame(gameId)` on contract with msg.value = fee
* Stores block number and vault amount on-chain

### In-Game Rounds (4 total)

* Managed off-chain (Multisynq + Convex)
* Game stages:

  * Each round has 3 phases: vote (20s), commit (10s), cooldown (5s)
  * Thieves pick paths independently (no consensus)
  * Police must reach consensus on one blocked path
  * If a thief chooses the blocked path → eliminated
  * In final stage (4), one path is randomly selected as correct using blockhash logic in contract

### Game End

* After stage 4 (or if all thieves eliminated), creator clicks Finalize
* Contract function `finalizeGame(gameId, address[] winners)` distributes vault equally among winning addresses

---

## 5. UI Structure

* `/` → Welcome + Create / Join buttons
* `/create` → Team & nickname form
* `/join?room=XXX` → Enter nickname + team
* `/game/:roomId` →

  * Player list, team roles, eliminations
  * Real-time vote display per stage
  * Game status tracking
  * Only creator sees `Start Game` & `Finalize Game` buttons

---

## 6. Smart Contract Usage

* `startGame(gameId)` — sends MON and locks vault
* `finalizeGame(gameId, winners)` — splits reward
* `getGame(gameId)` — for vault amount, entryFee, started/finalized state

---

## 7. Real-time State

* All voting, turn sync, and eliminations handled with Multisynq
* Convex stores current stage, votes, eliminated players, player list, room configs

---

## 8. Design / Theme

Use the following color palette for dark-theme futuristic feel:

* **Primary:** `#836EF9`
* **Secondary:** `#200052`, `#FBFAF9`, `#A0055D`, `#0E100F`, `#FFFFFF`
* UI components should reflect heist + cyber themes

---

## 9. Future Extensions

* Leaderboards via Convex
* Replay viewer
* NFTs for winners
* Daily/weekly tournaments with variable config
* Admin-only room modifiers (stage count, reward split types)

---

## 10. Notes

* Entry fee is only processed on-chain at `startGame()`
* All in-game logic is off-chain and enforced by frontend/backend logic
* Contract is designed to be minimal and focused only on prize safety
