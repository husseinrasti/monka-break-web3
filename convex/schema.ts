import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  gameConfig: defineTable({
    minThieves: v.number(),
    minPolice: v.number(),
    minPlayersToStart: v.number(),
    maxTotalPlayers: v.number(),
  }),

  rooms: defineTable({
    creator: v.string(), // wallet address
    entryFee: v.number(), // in MON
    started: v.boolean(),
    finalized: v.boolean(),
    requiredMinPlayers: v.number(),
    currentRound: v.number(),
    maxRounds: v.number(),
    roomCode: v.string(),
    winningPath: v.optional(v.string()),
    gamePhase: v.union(
      v.literal("waiting"),
      v.literal("voting"),
      v.literal("committing"), 
      v.literal("cooldown"),
      v.literal("finished")
    ),
    phaseEndTime: v.optional(v.number()),
  }).index("by_room_code", ["roomCode"]),

  players: defineTable({
    address: v.string(), // wallet address
    nickname: v.optional(v.string()),
    role: v.union(v.literal("thief"), v.literal("police")),
    roomId: v.id("rooms"),
    eliminated: v.boolean(),
    moves: v.array(v.string()), // array of moves for each round
    hasCommitted: v.boolean(), // for current round
  }).index("by_room", ["roomId"])
    .index("by_address", ["address"])
    .index("by_room_and_address", ["roomId", "address"]),

  votes: defineTable({
    roomId: v.id("rooms"),
    round: v.number(), // which round (0-3)
    address: v.string(), // wallet address of voter
    choice: v.string(), // A/B/C or custom path name
    role: v.union(v.literal("thief"), v.literal("police")),
    committed: v.boolean(), // whether this vote was committed to blockchain
  }).index("by_room_and_round", ["roomId", "round"])
    .index("by_room_round_address", ["roomId", "round", "address"]),
}); 