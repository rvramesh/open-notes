import type { FastifyInstance } from "fastify";

interface EnrichRequestBody {
  noteId: string;
  title: string;
  content: string;
  categoryId?: string;
  enrichmentPrompt?: string;
}

interface EnrichmentBlock {
  id: string;
  type: string;
  content: string;
  createdAt: number;
}

interface EnrichResponse {
  enrichmentBlocks: EnrichmentBlock[];
}

function createEnrichmentBlock(content: string): EnrichmentBlock {
  return {
    id: `enrich-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "paragraph",
    content,
    createdAt: Date.now(),
  };
}

export async function registerEnrichRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: EnrichRequestBody; Reply: EnrichResponse }>(
    "/api/enrich",
    async (request, reply) => {
      const { title, content, categoryId } = request.body;

      const preview = content.trim().slice(0, 500);
      const header = categoryId ? `Category: ${categoryId}` : "Uncategorized";
      const enrichmentText = `Summary\n${header}\n\n${preview}`.trim();

      return reply.send({
        enrichmentBlocks: [createEnrichmentBlock(enrichmentText)],
      });
    }
  );
}
