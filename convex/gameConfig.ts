import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Default configuration values
const DEFAULT_CONFIG = {
  minThieves: 1,
  minPolice: 1,
  minPlayersToStart: 2,
  maxTotalPlayers: 10,
};

export const getGameConfig = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("gameConfig"),
      _creationTime: v.number(),
      minThieves: v.number(),
      minPolice: v.number(),
      minPlayersToStart: v.number(),
      maxTotalPlayers: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get existing config - queries are read-only
    const config = await ctx.db.query("gameConfig").first();
    return config;
  },
});

export const getOrCreateGameConfig = query({
  args: {},
  returns: v.object({
    minThieves: v.number(),
    minPolice: v.number(),
    minPlayersToStart: v.number(),
    maxTotalPlayers: v.number(),
  }),
  handler: async (ctx) => {
    // Get existing config or return defaults
    const config = await ctx.db.query("gameConfig").first();
    
    if (config) {
      return {
        minThieves: config.minThieves,
        minPolice: config.minPolice,
        minPlayersToStart: config.minPlayersToStart,
        maxTotalPlayers: config.maxTotalPlayers,
      };
    }
    
    // Return default values if no config exists
    return DEFAULT_CONFIG;
  },
});

export const initializeGameConfig = mutation({
  args: {},
  returns: v.id("gameConfig"),
  handler: async (ctx) => {
    // Check if config already exists
    const existingConfig = await ctx.db.query("gameConfig").first();
    if (existingConfig) {
      return existingConfig._id;
    }
    
    // Create default config
    const configId = await ctx.db.insert("gameConfig", DEFAULT_CONFIG);
    return configId;
  },
});

export const updateGameConfig = mutation({
  args: {
    minThieves: v.optional(v.number()),
    minPolice: v.optional(v.number()),
    minPlayersToStart: v.optional(v.number()),
    maxTotalPlayers: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const config = await ctx.db.query("gameConfig").first();
    
    if (!config) {
      // Create config with provided values merged with defaults
      await ctx.db.insert("gameConfig", {
        ...DEFAULT_CONFIG,
        ...args,
      });
    } else {
      // Update existing config
      const updates: any = {};
      if (args.minThieves !== undefined) updates.minThieves = args.minThieves;
      if (args.minPolice !== undefined) updates.minPolice = args.minPolice;
      if (args.minPlayersToStart !== undefined) updates.minPlayersToStart = args.minPlayersToStart;
      if (args.maxTotalPlayers !== undefined) updates.maxTotalPlayers = args.maxTotalPlayers;
      
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(config._id, updates);
      }
    }
    
    return null;
  },
});

// Simple helper function to ensure config is created without circular references
export const ensureConfigExists = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const config = await ctx.db.query("gameConfig").first();
    if (!config) {
      await ctx.db.insert("gameConfig", DEFAULT_CONFIG);
    }
    return null;
  },
}); 