import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Generate a random 6-character room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createRoom = mutation({
  args: {
    creator: v.string(),
    nickname: v.optional(v.string()),
    role: v.union(v.literal("thief"), v.literal("police")),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    roomCode: v.string(),
  }),
  handler: async (ctx, args) => {
    // Generate unique room code
    let roomCode = generateRoomCode();
    let existingRoom = await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) => q.eq("roomCode", roomCode))
      .first();
    
    while (existingRoom) {
      roomCode = generateRoomCode();
      existingRoom = await ctx.db
        .query("rooms")
        .withIndex("by_room_code", (q) => q.eq("roomCode", roomCode))
        .first();
    }

    // Get game config for min players
    const config = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    // Create room without entry fee (will be set when starting game)
    const roomId = await ctx.db.insert("rooms", {
      creator: args.creator,
      entryFee: 0, // Will be set when starting the game
      started: false,
      finalized: false,
      requiredMinPlayers: config.minPlayersToStart,
      currentRound: 0,
      maxRounds: 4,
      roomCode,
      gamePhase: "waiting" as const,
    });

    // Add creator as first player
    await ctx.db.insert("players", {
      address: args.creator,
      nickname: args.nickname,
      role: args.role,
      roomId,
      eliminated: false,
      moves: [],
      hasCommitted: false,
    });

    return { roomId, roomCode };
  },
});

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    address: v.string(),
    nickname: v.optional(v.string()),
    role: v.union(v.literal("thief"), v.literal("police")),
  },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    // Find room by code
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.started) {
      throw new Error("Game already started");
    }

    // Check if player already in room
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_room_and_address", (q) => 
        q.eq("roomId", room._id).eq("address", args.address)
      )
      .first();

    if (existingPlayer) {
      throw new Error("Already in this room");
    }

    // Get game config for player limits
    const config = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    // Check team balance and total player limit
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    // Check total players limit
    if (players.length >= config.maxTotalPlayers) {
      throw new Error("Room is full");
    }

    // Check team balance (max half of total players per team)
    const maxPerTeam = Math.floor(config.maxTotalPlayers / 2);
    const roleCount = players.filter(p => p.role === args.role).length;
    if (roleCount >= maxPerTeam) {
      throw new Error(`Team ${args.role} is full`);
    }

    // Add player to room
    await ctx.db.insert("players", {
      address: args.address,
      nickname: args.nickname,
      role: args.role,
      roomId: room._id,
      eliminated: false,
      moves: [],
      hasCommitted: false,
    });

    return room._id;
  },
});

export const getRoomByCode = query({
  args: { roomCode: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("rooms"),
      _creationTime: v.number(),
      creator: v.string(),
      entryFee: v.number(),
      started: v.boolean(),
      finalized: v.boolean(),
      requiredMinPlayers: v.number(),
      currentRound: v.number(),
      maxRounds: v.number(),
      roomCode: v.string(),
      gamePhase: v.union(
        v.literal("waiting"),
        v.literal("voting"),
        v.literal("committing"),
        v.literal("cooldown"),
        v.literal("finished")
      ),
      phaseEndTime: v.optional(v.number()),
      winningPath: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .first();
  },
});

export const getRoomPlayers = query({
  args: { roomId: v.id("rooms") },
  returns: v.array(v.object({
    _id: v.id("players"),
    _creationTime: v.number(),
    address: v.string(),
    nickname: v.optional(v.string()),
    role: v.union(v.literal("thief"), v.literal("police")),
    roomId: v.id("rooms"),
    eliminated: v.boolean(),
    moves: v.array(v.string()),
    hasCommitted: v.boolean(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const startGame = mutation({
  args: { 
    roomId: v.id("rooms"), 
    creatorAddress: v.string(),
    entryFee: v.number(),
    transactionHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.creator !== args.creatorAddress) {
      throw new Error("Only room creator can start the game");
    }

    if (room.started) {
      throw new Error("Game already started");
    }

    if (args.entryFee < 2) {
      throw new Error("Minimum entry fee is 2 MON");
    }

    // Get game config for minimum players
    const config = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    // Check minimum players
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const thieves = players.filter(p => p.role === "thief");
    const police = players.filter(p => p.role === "police");

    if (thieves.length < config.minThieves || police.length < config.minPolice) {
      throw new Error(`Need at least ${config.minThieves} thieves and ${config.minPolice} police to start`);
    }

    if (players.length < config.minPlayersToStart) {
      throw new Error(`Need at least ${config.minPlayersToStart} players to start`);
    }

    // Start the game with entry fee
    await ctx.db.patch(args.roomId, {
      started: true,
      entryFee: args.entryFee,
      gamePhase: "voting" as const,
      phaseEndTime: Date.now() + 20000, // 20 seconds for voting
      currentRound: 1,
    });

    return null;
  },
});

export const listActiveRooms = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("rooms"),
    creator: v.string(),
    entryFee: v.number(),
    roomCode: v.string(),
    playerCount: v.number(),
    started: v.boolean(),
  })),
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("finalized"), false))
      .order("desc")
      .take(20);

    const roomsWithPlayerCount = await Promise.all(
      rooms.map(async (room) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        
        return {
          _id: room._id,
          creator: room.creator,
          entryFee: room.entryFee,
          roomCode: room.roomCode,
          playerCount: players.length,
          started: room.started,
        };
      })
    );

    return roomsWithPlayerCount;
  },
}); 