import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.routes.js";
import { registerSettingsRoutes } from "./settings.routes.js";
import { registerCategorizeRoutes } from "./categorize.routes.js";
import { registerEnrichRoutes } from "./enrich.routes.js";

/**
 * Register all API routes for the application
 * This is the central place to organize and register all route groups
 */
export async function registerRoutes(fastify: FastifyInstance) {
  fastify.log.info("Registering API routes");
  
  // Register health check endpoints
  await registerHealthRoutes(fastify);
  
  // Register settings endpoints
  await registerSettingsRoutes(fastify);

  // Register categorization endpoints
  await registerCategorizeRoutes(fastify);

  // Register enrichment endpoints
  await registerEnrichRoutes(fastify);
  
  // Additional route groups can be registered here as the app grows
  // e.g., registerUserRoutes(fastify), registerNoteRoutes(fastify), etc.
  
  fastify.log.info("All routes registered successfully");
}
