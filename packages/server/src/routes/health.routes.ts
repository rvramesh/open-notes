import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(fastify: FastifyInstance) {
  fastify.get("/api/health", async (request, reply) => {
    return { status: "ok" };
  });

  // Additional health check endpoint for metrics
  fastify.get("/api/health/live", async (request, reply) => {
    return { status: "alive", timestamp: new Date().toISOString() };
  });

  fastify.get("/api/health/ready", async (request, reply) => {
    // You can add readiness checks here (e.g., database connection)
    return { status: "ready", timestamp: new Date().toISOString() };
  });
}
