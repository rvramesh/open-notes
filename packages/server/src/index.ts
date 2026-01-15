import cors from "@fastify/cors";
import Fastify from "fastify";
import { getSettingsManager } from "./settings-manager.js";
import type { ServerConfig } from "./adapters/FileSystemSettingsAdapter.js";

export async function createApp(devServerUrl?: string) {
  const fastify = Fastify({
    logger: true,
  });

  // Load settings before starting server
  const settingsManager = getSettingsManager();
  await settingsManager.load();
  
  fastify.log.info('Server settings loaded from: ' + settingsManager.getSettingsPath());

  // Configure CORS based on environment
  const allowedOrigins = ["file://", "http://localhost:3000", "http://127.0.0.1:3000"];
  if (devServerUrl) {
    // Normalize URL by removing trailing slash
    const normalized = devServerUrl.replace(/\/$/, "");
    allowedOrigins.push(normalized);
    // Also add variant with 127.0.0.1 if using localhost or vice versa
    if (normalized.includes("localhost")) {
      allowedOrigins.push(normalized.replace("localhost", "127.0.0.1"));
    } else if (normalized.includes("127.0.0.1")) {
      allowedOrigins.push(normalized.replace("127.0.0.1", "localhost"));
    }
  }

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, or Electron file://)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Check if origin is allowed
      const allowed = allowedOrigins.some(
        (allowed) => origin === allowed || origin.startsWith(allowed + "/")
      );

      if (allowed) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  });

  fastify.get("/health", async (request, reply) => {
    return { status: "ok" };
  });

  // Settings endpoints
  fastify.get<{ Reply: ServerConfig }>("/api/settings", async (request, reply) => {
    const config = await settingsManager.getConfig();
    return config;
  });

  fastify.post("/api/settings/reload", async (request, reply) => {
    await settingsManager.reload();
    return { success: true, message: "Settings reloaded successfully" };
  });

  return fastify;
}
