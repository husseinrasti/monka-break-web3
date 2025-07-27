import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitVote = mutation({
  args: {
    roomId: v.id("rooms"),
    address: v.string(),
    choice: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.gamePhase !== "voting") {
      throw new Error("Not in voting phase");
    }

    // Get player info
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_address", (q) => 
        q.eq("roomId", args.roomId).eq("address", args.address)
      )
      .first();

    if (!player) {
      throw new Error("Player not found in this room");
    }

    if (player.eliminated) {
      throw new Error("Eliminated players cannot vote");
    }

    // Check if vote already exists for this round
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_room_round_address", (q) => 
        q.eq("roomId", args.roomId)
         .eq("round", room.currentRound)
         .eq("address", args.address)
      )
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        choice: args.choice,
        committed: false,
      });
    } else {
      // Create new vote
      await ctx.db.insert("votes", {
        roomId: args.roomId,
        round: room.currentRound,
        address: args.address,
        choice: args.choice,
        role: player.role,
        committed: false,
      });
    }

    return null;
  },
});

export const getRoundVotes = query({
  args: { 
    roomId: v.id("rooms"),
    round: v.number(),
  },
  returns: v.array(v.object({
    _id: v.id("votes"),
    address: v.string(),
    choice: v.string(),
    role: v.union(v.literal("thief"), v.literal("police")),
    committed: v.boolean(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_room_and_round", (q) => 
        q.eq("roomId", args.roomId).eq("round", args.round)
      )
      .collect();
  },
});

export const getPlayerVote = query({
  args: {
    roomId: v.id("rooms"),
    round: v.number(),
    address: v.string(),
  },
  returns: v.union(v.null(), v.object({
    _id: v.id("votes"),
    choice: v.string(),
    committed: v.boolean(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_room_round_address", (q) => 
        q.eq("roomId", args.roomId)
         .eq("round", args.round)
         .eq("address", args.address)
      )
      .first();
  },
});

export const commitVote = mutation({
  args: {
    roomId: v.id("rooms"),
    address: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.gamePhase !== "committing") {
      throw new Error("Not in committing phase");
    }

    // Find player's vote for current round
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_room_round_address", (q) => 
        q.eq("roomId", args.roomId)
         .eq("round", room.currentRound)
         .eq("address", args.address)
      )
      .first();

    if (!vote) {
      throw new Error("No vote found for this round");
    }

    // Mark vote as committed
    await ctx.db.patch(vote._id, { committed: true });

    // Mark player as committed
    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_address", (q) => 
        q.eq("roomId", args.roomId).eq("address", args.address)
      )
      .first();

    if (player) {
      await ctx.db.patch(player._id, { hasCommitted: true });
    }

    return null;
  },
});

export const getPoliceVoteSummary = query({
  args: {
    roomId: v.id("rooms"),
    round: v.number(),
  },
  returns: v.object({
    totalVotes: v.number(),
    choices: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_room_and_round", (q) => 
        q.eq("roomId", args.roomId).eq("round", args.round)
      )
      .filter((q) => q.eq(q.field("role"), "police"))
      .collect();

    const choices: Record<string, number> = {};
    votes.forEach(vote => {
      choices[vote.choice] = (choices[vote.choice] || 0) + 1;
    });

    return {
      totalVotes: votes.length,
      choices,
    };
  },
}); 