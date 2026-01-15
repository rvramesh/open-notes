import type { FastifyInstance } from "fastify";
import { getSettingsManager } from "../settings-manager.js";
import type { ServerConfig, Settings } from "../adapters/FileSystemSettingsAdapter.js";

export async function registerSettingsRoutes(fastify: FastifyInstance) {
  const settingsManager = getSettingsManager();

  // GET current settings configuration
  fastify.get<{ Reply: ServerConfig }>("/api/settings", async (request, reply) => {
    fastify.log.debug("Fetching current settings configuration");
    const config = await settingsManager.getConfig();
    return config;
  });

  // POST to save/update settings
  fastify.post<{ Body: Partial<Settings> }>("/api/settings", async (request, reply) => {
    fastify.log.info({ 
      hasLanguageModel: !!request.body.languageModel,
      hasEmbeddingModel: !!request.body.embeddingModel,
      categoriesCount: request.body.categories?.length || 0,
      theme: request.body.theme,
      fontSize: request.body.fontSize
    }, "Received settings from client");
    
    try {
      const clientSettings = request.body;
      
      // Load current settings from filesystem
      const currentSettings = await settingsManager.getAdapter().load();
      
      // Merge with client updates (preserve client-side only fields like theme, fontSize, editorSettings)
      const mergedSettings: Settings = {
        ...currentSettings,
        ...clientSettings,
        // Ensure we have the required fields
        categories: clientSettings.categories || currentSettings.categories,
        genericEnrichmentPrompt: clientSettings.genericEnrichmentPrompt || currentSettings.genericEnrichmentPrompt,
        categoryRecognitionPrompt: clientSettings.categoryRecognitionPrompt || currentSettings.categoryRecognitionPrompt,
      };
      
      // Save to filesystem
      await settingsManager.save(mergedSettings);
      
      const settingsPath = settingsManager.getSettingsPath();
      fastify.log.info({ path: settingsPath }, "Settings saved successfully");
      
      return { 
        success: true, 
        message: "Settings saved successfully",
        timestamp: new Date().toISOString(),
        path: settingsPath
      };
    } catch (error) {
      fastify.log.error({ error }, "Failed to save settings");
      reply.code(500);
      return {
        success: false,
        message: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  });

  // POST to reload settings from disk
  fastify.post("/api/settings/reload", async (request, reply) => {
    fastify.log.info("Reloading settings from disk");
    await settingsManager.reload();
    return { 
      success: true, 
      message: "Settings reloaded successfully",
      timestamp: new Date().toISOString()
    };
  });

  // GET settings metadata
  fastify.get("/api/settings/info", async (request, reply) => {
    return {
      settingsPath: settingsManager.getSettingsPath(),
      lastLoaded: new Date().toISOString(),
      version: "1.0.0"
    };
  });
}
