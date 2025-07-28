import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Default configuration values from PRD
const DEFAULT_CONFIG = {
  minThieves: 1,
  minPolice: 1,
  minPlayersToStart: 2,
  maxTotalPlayers: 10,
  entryFeeMinimum: 2,
  stageCount: 4,
  pathsPerStage: 3,
  timings: {
    commitDuration: 30,
    cooldown: 10,
    voteDuration: 40,
  },
  defaultThiefNames: ["John", "John", "John"],
  defaultPoliceNames: ["Keone", "Bill", "Mike", "James"],
  allowUnevenTeams: true
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
      entryFeeMinimum: v.optional(v.number()),
      stageCount: v.optional(v.number()),
      pathsPerStage: v.optional(v.number()),
      timings: v.optional(v.object({
        voteDuration: v.number(),
        commitDuration: v.number(),
        cooldown: v.number()
      })),
      defaultThiefNames: v.optional(v.array(v.string())),
      defaultPoliceNames: v.optional(v.array(v.string())),
      allowUnevenTeams: v.optional(v.boolean())
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
    entryFeeMinimum: v.number(),
    stageCount: v.number(),
    pathsPerStage: v.number(),
    timings: v.object({
      voteDuration: v.number(),
      commitDuration: v.number(),
      cooldown: v.number()
    }),
    defaultThiefNames: v.array(v.string()),
    defaultPoliceNames: v.array(v.string()),
    allowUnevenTeams: v.boolean()
  }),
  handler: async (ctx) => {
    // Get existing config or return defaults
    const config = await ctx.db.query("gameConfig").first();
    
    if (config) {
      // Return config with fallbacks for any missing fields
      return {
        minThieves: config.minThieves ?? DEFAULT_CONFIG.minThieves,
        minPolice: config.minPolice ?? DEFAULT_CONFIG.minPolice,
        minPlayersToStart: config.minPlayersToStart ?? DEFAULT_CONFIG.minPlayersToStart,
        maxTotalPlayers: config.maxTotalPlayers ?? DEFAULT_CONFIG.maxTotalPlayers,
        entryFeeMinimum: config.entryFeeMinimum ?? DEFAULT_CONFIG.entryFeeMinimum,
        stageCount: config.stageCount ?? DEFAULT_CONFIG.stageCount,
        pathsPerStage: config.pathsPerStage ?? DEFAULT_CONFIG.pathsPerStage,
        timings: config.timings ?? DEFAULT_CONFIG.timings,
        defaultThiefNames: config.defaultThiefNames ?? DEFAULT_CONFIG.defaultThiefNames,
        defaultPoliceNames: config.defaultPoliceNames ?? DEFAULT_CONFIG.defaultPoliceNames,
        allowUnevenTeams: config.allowUnevenTeams ?? DEFAULT_CONFIG.allowUnevenTeams
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

// Migration function to ensure existing configs have all new fields
export const migrateGameConfig = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const config = await ctx.db.query("gameConfig").first();
    
    if (!config) {
      // No config exists, create default one
      await ctx.db.insert("gameConfig", DEFAULT_CONFIG);
      return null;
    }

    // Check if config is missing any of the new fields and update if needed
    const updates: any = {};
    if (config.entryFeeMinimum === undefined) updates.entryFeeMinimum = DEFAULT_CONFIG.entryFeeMinimum;
    if (config.stageCount === undefined) updates.stageCount = DEFAULT_CONFIG.stageCount;
    if (config.pathsPerStage === undefined) updates.pathsPerStage = DEFAULT_CONFIG.pathsPerStage;
    if (config.timings === undefined) updates.timings = DEFAULT_CONFIG.timings;
    if (config.defaultThiefNames === undefined) {
      // Migrate from old defaultThiefName (string) to defaultThiefNames (array)
      const oldConfig = config as any;
      if (oldConfig.defaultThiefName) {
        updates.defaultThiefNames = [oldConfig.defaultThiefName, ...DEFAULT_CONFIG.defaultThiefNames.slice(1)];
      } else {
        updates.defaultThiefNames = DEFAULT_CONFIG.defaultThiefNames;
      }
    }
    if (config.defaultPoliceNames === undefined) updates.defaultPoliceNames = DEFAULT_CONFIG.defaultPoliceNames;
    if (config.allowUnevenTeams === undefined) updates.allowUnevenTeams = DEFAULT_CONFIG.allowUnevenTeams;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(config._id, updates);
    }

    return null;
  },
});

export const updateGameConfig = mutation({
  args: {
    minThieves: v.optional(v.number()),
    minPolice: v.optional(v.number()),
    minPlayersToStart: v.optional(v.number()),
    maxTotalPlayers: v.optional(v.number()),
    entryFeeMinimum: v.optional(v.number()),
    stageCount: v.optional(v.number()),
    pathsPerStage: v.optional(v.number()),
    timings: v.optional(v.object({
      voteDuration: v.number(),
      commitDuration: v.number(),
      cooldown: v.number()
    })),
    defaultThiefNames: v.optional(v.array(v.string())),
    defaultPoliceNames: v.optional(v.array(v.string())),
    allowUnevenTeams: v.optional(v.boolean())
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
      if (args.entryFeeMinimum !== undefined) updates.entryFeeMinimum = args.entryFeeMinimum;
      if (args.stageCount !== undefined) updates.stageCount = args.stageCount;
      if (args.pathsPerStage !== undefined) updates.pathsPerStage = args.pathsPerStage;
      if (args.timings !== undefined) updates.timings = args.timings;
      if (args.defaultThiefNames !== undefined) updates.defaultThiefNames = args.defaultThiefNames;
      if (args.defaultPoliceNames !== undefined) updates.defaultPoliceNames = args.defaultPoliceNames;
      if (args.allowUnevenTeams !== undefined) updates.allowUnevenTeams = args.allowUnevenTeams;
      
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

// Cleanup migration to remove old defaultThiefName field
export const cleanupOldThiefNameField = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const config = await ctx.db.query("gameConfig").first();
    
    if (config) {
      const oldConfig = config as any;
      if (oldConfig.defaultThiefName !== undefined) {
        // Remove the old field by replacing the entire document without it
        const cleanedConfig = {
          minThieves: config.minThieves,
          minPolice: config.minPolice,
          minPlayersToStart: config.minPlayersToStart,
          maxTotalPlayers: config.maxTotalPlayers,
          entryFeeMinimum: oldConfig.entryFeeMinimum,
          stageCount: oldConfig.stageCount,
          pathsPerStage: oldConfig.pathsPerStage,
          timings: oldConfig.timings,
          defaultThiefNames: oldConfig.defaultThiefNames,
          defaultPoliceNames: oldConfig.defaultPoliceNames,
          allowUnevenTeams: oldConfig.allowUnevenTeams,
        };
        
        await ctx.db.replace(config._id, cleanedConfig);
      }
    }
    
    return null;
  },
}); 