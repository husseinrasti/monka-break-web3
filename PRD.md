**Product Requirements Document (PRD)**

**Project:** Crypto Heist
**Component:** App (Frontend + Convex + Multisynq + viem)
**Goal:** Build the frontend interface and real-time multiplayer logic for Crypto Heist, integrating with the smart contract and enabling a fast, dynamic on-chain gaming experience.

---

## 1. Overview

Crypto Heist is a strategic on-chain game built on the Monad Testnet. Players join game rooms as either Thieves or Police. Using Multisynq for real-time coordination and viem for wallet interactions, the frontend allows users to create/join rooms, participate in rounds, and finalize games.

Convex is used for off-chain data such as room listings, user nicknames, player states, and round syncing.

---

## 2. Stack

* **Framework:** Next.js + ShadCN (mobile-first UI)
* **Wallet Integration:** viem (MetaMask, Phantom, WalletConnect, etc.)
* **Realtime Layer:** Multisynq
* **Backend (DB + Logic):** Convex
* **Blockchain:** Monad Testnet (smart contract already defined)

---

## 3. Pages / Routes

### 3.1 Home (`/`)

* Show two buttons:

  * `Create Game`
  * `Join Game`
* Optional: Active game rooms list (from Convex)

### 3.2 Create Game (`/create`)

* Input:

  * Entry fee (min 2 MON)
  * Choose team (Thief or Police)
  * Optional nickname
* On submit:

  * Creates room in Convex
  * Displays room code to share

### 3.3 Join Game (`/join?room=XXX`)

* Input:

  * Room code
  * Choose team (if slots available)
  * Optional nickname
* On join:

  * Registers player in Convex for this room
  * Connects to Multisynq room with player info

### 3.4 Game Room (`/game/:roomId`)

* Shows:

  * List of players, nicknames, roles, status (eliminated/active)
  * Game status (waiting / in progress / finished)
  * Host control if current user is the room creator
  * `Start Game` button (visible only to creator)

### 3.5 Active Round (Inside `/game/:roomId`)

* Each round consists of:

  * 20s Team Voting:

    * Thieves: Select individual path (A/B/C or custom name)
    * Police: Vote collectively (Multisynq synced)
  * 10s On-chain Commit:

    * Button appears to `Confirm Move`
    * Fails if not enough players submit (min 2/3 per team)
  * 5s Cooldown → next round
* Progress bar or timer for all phases
* Only one round active at a time (up to 4)

### 3.6 End Game Screen

* Shows winner(s)
* If current user is host:

  * `Finalize Game` button to trigger reward distribution
* List of who won + claimable amount

---

## 4. Multisynq Usage

* Each game room is a Multisynq room
* Used for:

  * Broadcasting selected paths during voting
  * Syncing player state changes (join, eliminate, commit)
  * Real-time display of police votes

---

## 5. Convex Schema (Draft)

```ts
// tables: rooms, players, votes
Room: {
  id: string,
  creator: string,
  entryFee: number,
  started: boolean,
  finalized: boolean,
  requiredMinPlayers: number,
  createdAt: number
}

Player: {
  address: string,
  nickname: string,
  role: 'thief' | 'police',
  roomId: string,
  eliminated: boolean,
  moves: string[],
}

Vote: {
  roomId: string,
  stage: number,
  address: string,
  choice: string // A/B/C
}
```

---

## 6. Wallet Connection (via viem)

* Show modal with common wallets (MetaMask, Phantom, WalletConnect)
* Must switch to Monad Testnet
* Show ENS if available
* After connection, store address in local storage + Convex

---

## 7. Game Flow Summary

1. User connects wallet
2. User creates or joins room
3. Room gets populated until team conditions are satisfied
4. Host clicks `Start Game`
5. 4 rounds play with voting + blockchain confirmation
6. Final round includes randomness to determine winning path
7. Host finalizes and triggers on-chain reward split

---

## 8. Future Enhancements

* Add sound / animation per round
* Enable friend invites via shareable room links
* Leaderboard via Convex
* Game history / replay
* Allow name + avatar selection
* Dynamic gas estimation + UI feedback

---

## 9. UI Theme & Colors

The app should follow a dark-themed, immersive visual style inspired by heists and crypto vaults. Use the following palette:

    Primary Color: #836EF9 (vibrant purple for highlights, CTAs, and selection indicators)

    Secondary Palette:

        #200052 (deep purple-black background)

        #FBFAF9 (off-white text or subtle backgrounds)

        #A0055D (accent color for danger/warnings — used in eliminations or alerts)

        #0E100F (dark grey background elements or borders)

        #FFFFFF (pure white for text on dark background)

These colors should be consistently applied across all components (buttons, modals, timers, etc.) to maintain a coherent and distinctive aesthetic.