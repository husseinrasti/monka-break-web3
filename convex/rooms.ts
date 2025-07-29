import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Generate a random 6-character room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper function to resolve round results
const resolveRoundResults = async (ctx: any, roomId: Id<"rooms">, currentRound: number): Promise<{
  winningPath: string;
  eliminatedPlayers: number;
  totalVotes: number;
  policeChoice: string;
}> => {
  // Get all votes for this round
  const votes = await ctx.db
    .query("votes")
    .withIndex("by_room_and_round", (q: any) => 
      q.eq("roomId", roomId).eq("round", currentRound)
    )
    .collect();

  // Get all players in the room
  const players = await ctx.db
    .query("players")
    .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
    .collect();

  // Get game config for path names
  const config: any = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
  const stageIndex = currentRound - 1;
  const stagePaths: string[] = config.pathNames?.slice(stageIndex * 3, stageIndex * 3 + 3) || [];
  
  // Separate votes by role
  const policeVotes = votes.filter((v: any) => v.role === 'police');
  const thiefVotes = votes.filter((v: any) => v.role === 'thief');
  
  // Determine police choice (most voted path by police)
  const policeChoiceCounts: Record<string, number> = {};
  policeVotes.forEach((vote: any) => {
    policeChoiceCounts[vote.choice] = (policeChoiceCounts[vote.choice] || 0) + 1;
  });
  
  let policeChoice = '';
  if (Object.keys(policeChoiceCounts).length > 0) {
    policeChoice = Object.entries(policeChoiceCounts).reduce((a, b) => 
      policeChoiceCounts[a[0]] > policeChoiceCounts[b[0]] ? a : b
    )[0];
  } else {
    // If no police voted, randomly select a path as their choice
    policeChoice = stagePaths[Math.floor(Math.random() * stagePaths.length)] || stagePaths[0] || '';
  }
  
  // Determine winning path (randomly select from stage paths, excluding police choice)
  const availablePaths: string[] = stagePaths.filter((path: string) => path !== policeChoice);
  const winningPath: string = availablePaths[Math.floor(Math.random() * availablePaths.length)] || stagePaths[0] || '';

  // Eliminate players based on correct logic
  const eliminatedPlayers: Id<"players">[] = [];
  
  for (const player of players) {
    const playerVote = votes.find((v: any) => v.address === player.address);
    
    if (player.role === 'police') {
      // Police should NEVER be eliminated
      // They continue participating regardless of their vote or lack thereof
      continue;
    } else if (player.role === 'thief') {
      // Thieves are eliminated only if they chose the path that was blocked by police
      if (playerVote && playerVote.choice === policeChoice) {
        // Thief chose the path that police blocked - eliminate them
        await ctx.db.patch(player._id, { eliminated: true });
        eliminatedPlayers.push(player._id);
      }
      // If thief didn't vote or chose a different path, they survive
    }
  }

  return {
    winningPath,
    eliminatedPlayers: eliminatedPlayers.length,
    totalVotes: votes.length,
    policeChoice
  };
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

    // Get actual game config
    const config = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    // Create room without entry fee (will be set when starting game)
    const roomId: Id<"rooms"> = await ctx.db.insert("rooms", {
      creator: args.creator,
      entryFee: 0, // Will be set when starting the game
      started: false,
      finalized: false,
      requiredMinPlayers: config.minPlayersToStart,
      currentRound: 0,
      maxRounds: config.stageCount,
      roomCode,
      gamePhase: "waiting" as const,
    });

    // Use default nickname if none provided
    let playerNickname = args.nickname;
    if (!playerNickname) {
      if (args.role === "thief") {
        const randomIndex = Math.floor(Math.random() * config.defaultThiefNames.length);
        playerNickname = config.defaultThiefNames[randomIndex];
      } else {
        const randomIndex = Math.floor(Math.random() * config.defaultPoliceNames.length);
        playerNickname = config.defaultPoliceNames[randomIndex];
      }
    }

    // Add creator as first player
    await ctx.db.insert("players", {
      address: args.creator,
      nickname: playerNickname,
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
      // If player is already in room, update their info if game hasn't started
      if (!room.started) {
        // Get config for default nicknames
        const config = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
        
        // Use default nickname if none provided
        let playerNickname = args.nickname;
        if (!playerNickname) {
          if (args.role === "thief") {
            const randomIndex = Math.floor(Math.random() * config.defaultThiefNames.length);
            playerNickname = config.defaultThiefNames[randomIndex];
          } else {
            const randomIndex = Math.floor(Math.random() * config.defaultPoliceNames.length);
            playerNickname = config.defaultPoliceNames[randomIndex];
          }
        }

        // Update existing player's info
        await ctx.db.patch(existingPlayer._id, {
          nickname: playerNickname,
          role: args.role,
        });
      }
      // Return room ID (allow rejoining)
      return room._id;
    }

    // Get actual game config
    const joinConfig = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    // Check team balance and total player limit
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    // Check total players limit
    if (players.length >= joinConfig.maxTotalPlayers) {
      throw new Error("Room is full");
    }

    // Check team balance (max half of total players per team)
    const maxPerTeam = Math.floor(joinConfig.maxTotalPlayers / 2);
    const roleCount = players.filter(p => p.role === args.role).length;
    if (roleCount >= maxPerTeam) {
      throw new Error(`Team ${args.role} is full`);
    }

    // Use default nickname if none provided
    let playerNickname = args.nickname;
    if (!playerNickname) {
      if (args.role === "thief") {
        const randomIndex = Math.floor(Math.random() * joinConfig.defaultThiefNames.length);
        playerNickname = joinConfig.defaultThiefNames[randomIndex];
      } else {
        const randomIndex = Math.floor(Math.random() * joinConfig.defaultPoliceNames.length);
        playerNickname = joinConfig.defaultPoliceNames[randomIndex];
      }
    }

    // Add player to room
    await ctx.db.insert("players", {
      address: args.address,
      nickname: playerNickname,
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
      gameId: v.optional(v.number()),
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
        v.literal("finished")
      ),
      phaseEndTime: v.optional(v.number()),
      winningPath: v.optional(v.string()),
      vault: v.optional(v.number()),
      winners: v.optional(v.array(v.string())),
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
    gameId: v.number(),
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

    // Get actual game config for validation
    const config = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    if (args.entryFee < config.entryFeeMinimum) {
      throw new Error(`Minimum entry fee is ${config.entryFeeMinimum} MON`);
    }
    
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

    // Start the game with entry fee and smart contract integration
    await ctx.db.patch(args.roomId, {
      started: true,
      gameId: args.gameId,
      entryFee: args.entryFee,
      gamePhase: "voting" as const,
      phaseEndTime: Date.now() + (config.timings.voteDuration * 1000), // Use config timing
      currentRound: 1,
      maxRounds: config.stageCount, // Use config stage count
    });

    return null;
  },
});

export const resolveRound = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.object({
    winningPath: v.string(),
    eliminatedPlayers: v.number(),
    totalVotes: v.number(),
    policeChoice: v.string(),
    nextPhase: v.union(
      v.literal("voting"),
      v.literal("finished")
    ),
  }),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.started || room.finalized) {
      throw new Error("Game not active");
    }

    // Resolve the current round
    const result: {
      winningPath: string;
      eliminatedPlayers: number;
      totalVotes: number;
      policeChoice: string;
    } = await resolveRoundResults(ctx, args.roomId, room.currentRound);
    
    // Get config for timing
    const config: any = await ctx.runQuery(api.gameConfig.getOrCreateGameConfig, {});
    
    // Determine next phase
    let nextPhase: "voting" | "finished" = "finished";
    let phaseEndTime: number | undefined;
    let winners: string[] = [];
    
    if (room.currentRound < room.maxRounds) {
      // More rounds to go - move to next voting round
      nextPhase = "voting";
      phaseEndTime = Date.now() + (config.timings.voteDuration * 1000);
    } else {
      // Final round finished - determine winners
      nextPhase = "finished";
      
      // Get all players to determine winners
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();
      
      // Check if any thieves survived to the final round
      const survivingThieves = players.filter(p => p.role === 'thief' && !p.eliminated);
      
      if (survivingThieves.length > 0) {
        // Thieves win if any survived to the final round
        winners = survivingThieves.map(p => p.address);
      } else {
        // Police win if all thieves were eliminated
        const police = players.filter(p => p.role === 'police');
        winners = police.map(p => p.address);
      }
    }

    // Update room state
    const updateData: any = {
      gamePhase: nextPhase,
    };

    // Only set winningPath in the final round
    if (room.currentRound === room.maxRounds) {
      updateData.winningPath = result.winningPath;
      updateData.winners = winners;
    }

    if (nextPhase === "voting" && room.currentRound < room.maxRounds) {
      updateData.currentRound = room.currentRound + 1;
      updateData.phaseEndTime = phaseEndTime;
    } else if (nextPhase === "finished") {
      updateData.phaseEndTime = undefined;
    }

    await ctx.db.patch(args.roomId, updateData);

    return {
      winningPath: result.winningPath,
      eliminatedPlayers: result.eliminatedPlayers,
      totalVotes: result.totalVotes,
      policeChoice: result.policeChoice,
      nextPhase,
    };
  },
});

export const finalizeGame = mutation({
  args: {
    roomId: v.id("rooms"),
    creatorAddress: v.string(),
    winners: v.array(v.string()),
    vault: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.creator !== args.creatorAddress) {
      throw new Error("Only room creator can finalize the game");
    }

    if (!room.started) {
      throw new Error("Game not started");
    }

    if (room.finalized) {
      throw new Error("Game already finalized");
    }

    if (room.gamePhase !== "finished") {
      throw new Error("Game not finished yet");
    }

    // Update room with finalization data
    await ctx.db.patch(args.roomId, {
      finalized: true,
      winners: args.winners,
      vault: args.vault,
    });

    return null;
  },
});

export const refundGame = mutation({
  args: {
    roomId: v.id("rooms"),
    creatorAddress: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.creator !== args.creatorAddress) {
      throw new Error("Only room creator can refund the game");
    }

    if (!room.started) {
      throw new Error("Game must be started to refund");
    }

    if (room.finalized) {
      throw new Error("Game already finalized");
    }

    // Update room as refunded
    await ctx.db.patch(args.roomId, {
      finalized: true,
      winners: [], // Empty winners array for refund
      gamePhase: "finished",
    });

    return null;
  },
});

export const updateRoomGameId = mutation({
  args: {
    roomId: v.id("rooms"),
    gameId: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Update the room with the gameId
    await ctx.db.patch(args.roomId, {
      gameId: args.gameId,
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

// Cleanup function to remove a room and its associated players if creation fails
export const deleteRoom = mutation({
  args: { 
    roomId: v.id("rooms"),
    creatorAddress: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the caller is the room creator
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    if (room.creator !== args.creatorAddress) {
      throw new Error("Only the room creator can delete the room");
    }
    
    if (room.started) {
      throw new Error("Cannot delete a room that has already started");
    }
    
    // Delete all players in the room
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
      
    for (const player of players) {
      await ctx.db.delete(player._id);
    }
    
    // Delete all votes in the room (if any)
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_room_and_round", (q) => q.eq("roomId", args.roomId))
      .collect();
      
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }
    
    // Delete the room itself
    await ctx.db.delete(args.roomId);
    
    return null;
  },
}); 