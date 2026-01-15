import type { FastifyInstance } from "fastify";
import { generateText } from "ai";
import { getSettingsManager } from "../settings-manager.js";
import { createAIProvider } from "../providers/ai-provider-factory.js";

interface CategorizeRequestBody {
  noteId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  categories: Array<{ id: string; name: string }>;
}

interface CategorizeResponse {
  category: string[];
  tags: string[];
}

interface AICategorizationResult {
  category: string[];
  tags: string[];
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "or",
  "to",
  "of",
  "a",
  "in",
  "for",
  "on",
  "with",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "this",
  "that",
  "it",
  "from",
  "by",
  "an",
  "at",
  "not",
  "but",
  "into",
  "about",
  "via",
  "we",
  "you",
  "your",
  "our",
  "they",
]);

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-:|]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractExplicitTags(text: string): string[] {
  const tags: string[] = [];
  const regex = /#([^\s#]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const normalized = toKebabCase(match[1]);
    if (normalized) tags.push(normalized);
  }
  return tags;
}

function extractInferredTags(text: string, limit = 5): string[] {
  const counts = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => toKebabCase(word));

  return sorted;
}

function rankCategories(
  categories: Array<{ id: string; name: string }>,
  text: string
): string[] {
  const normalizedText = text.toLowerCase();
  const scores = categories.map((category) => {
    const name = category.name.toLowerCase();
    const count = normalizedText.split(name).length - 1;
    return { id: category.id, score: count };
  });

  return scores
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.id);
}

export async function registerCategorizeRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CategorizeRequestBody; Reply: CategorizeResponse }>(
    "/api/categorize",
    async (request, reply) => {
      const { title, content, categories } = request.body;
      const combinedText = `${title}\n\n${content}`;

      try {
        // Get settings manager instance
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getConfig();

        // Validate required configuration
        if (!settings?.languageModel?.apiKey) {
          fastify.log.warn(
            {
              noteId: request.body.noteId,
              reason: "MISSING_API_KEY",
              timestamp: new Date().toISOString(),
            },
            "⚠️ [CATEGORIZE] API key not configured in Language Model settings"
          );
          reply.code(400);
          throw new Error(
            "API key is not configured for the Language Model. Please configure it in Settings > AI Models > Language Model section."
          );
        }

        if (!settings?.languageModel?.modelName) {
          fastify.log.warn(
            {
              noteId: request.body.noteId,
              reason: "MISSING_MODEL_NAME",
              timestamp: new Date().toISOString(),
            },
            "⚠️ [CATEGORIZE] Model name not configured in Language Model settings"
          );
          reply.code(400);
          throw new Error(
            "Model name is not configured. Please configure it in Settings > AI Models > Language Model section."
          );
        }

        if (!settings?.languageModel?.provider) {
          fastify.log.warn(
            {
              noteId: request.body.noteId,
              reason: "MISSING_PROVIDER",
              timestamp: new Date().toISOString(),
            },
            "⚠️ [CATEGORIZE] Provider not configured in Language Model settings"
          );
          reply.code(400);
          throw new Error(
            "Provider is not configured. Please configure it in Settings > AI Models > Language Model section."
          );
        }

        // Load categoryPrompt from settings (at root level, not settings.ai)
        const categoryPrompt = settings?.categoryRecognitionPrompt;
        if (!categoryPrompt || !categoryPrompt.trim()) {
          fastify.log.warn(
            {
              noteId: request.body.noteId,
              reason: "MISSING_PROMPT_CONFIG",
              timestamp: new Date().toISOString(),
            },
            "⚠️ [CATEGORIZE] Category Recognition prompt not configured in settings"
          );
          reply.code(400);
          throw new Error(
            "Category Recognition prompt is not configured. Please configure it in Settings > AI Prompts > Category Recognition Prompt section."
          );
        }

        fastify.log.debug(
          {
            noteId: request.body.noteId,
            provider: settings.languageModel.provider,
            model: settings.languageModel.modelName,
            baseUrl: settings.languageModel.baseUrl,
            timestamp: new Date().toISOString(),
          },
          "🚀 [CATEGORIZE] Initializing AI provider"
        );

        // Create AI provider
        const provider = createAIProvider({
          provider: settings.languageModel.provider,
          apiKey: settings.languageModel.apiKey,
          baseUrl: settings.languageModel.baseUrl,
          modelName: settings.languageModel.modelName,
        });

        // Build the categorization prompt
        // Replace {{ categories }} placeholder with actual category IDs and names
        const categoryList = categories.map((c) => `- ${c.id}: ${c.name}`).join('\n');
        const systemPrompt = categoryPrompt.replace(
          '{{ categories }}',
          categoryList
        );

        // Format timestamps for display
        const createdDate = new Date(request.body.createdAt).toISOString();
        const updatedDate = new Date(request.body.updatedAt).toISOString();

        const userPrompt = `Analyze the following note and categorize it. Return your response as a JSON object with two fields:
- "category": an array of category IDs (not names) from the available categories that best fit this note. Use the ID from the list above (e.g., if category is listed as "cat-123: Project Documentation", return "cat-123")
- "tags": an array of relevant tags (keywords) extracted from the content

Note Title: ${title}

Note Created: ${createdDate}
Note Last Updated: ${updatedDate}

Note Content:
${content}

Return ONLY a valid JSON object with no additional text.`;

        fastify.log.debug(
          {
            noteId: request.body.noteId,
            provider: settings.languageModel.provider,
            model: settings.languageModel.modelName,
            contentLength: content.length,
            categoryCount: categories.length,
            timestamp: new Date().toISOString(),
          },
          "📤 [CATEGORIZE] Sending request to AI model"
        );

        // Call AI to categorize
        const result = await generateText({
          model: provider as any,
          prompt: userPrompt,
          system: systemPrompt,
        });

        fastify.log.debug(
          {
            noteId: request.body.noteId,
            responseLength: result.text.length,
            timestamp: new Date().toISOString(),
          },
          "✅ [CATEGORIZE] AI response received successfully"
        );

        // Parse the AI response
        const aiResponse: AICategorizationResult = JSON.parse(result.text);

        // Validate category IDs exist
        const categoryIds = aiResponse.category
          .filter((catId) => {
            const found = categories.find((c) => c.id === catId);
            if (!found) {
              fastify.log.debug(
                {
                  noteId: request.body.noteId,
                  invalidCategoryId: catId,
                  timestamp: new Date().toISOString(),
                },
                "⚠️ [CATEGORIZE] AI returned invalid category ID, skipping"
              );
              return false;
            }
            return true;
          });

        // Normalize tags to kebab-case
        const normalizedTags = aiResponse.tags.map((tag) => toKebabCase(tag));

        return reply.send({
          category: categoryIds,
          tags: normalizedTags,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        fastify.log.error(
          {
            noteId: request.body.noteId,
            error: errorMessage,
            stack: errorStack,
            reason: "AI_CATEGORIZATION_FAILED",
            timestamp: new Date().toISOString(),
          },
          "❌ [CATEGORIZE] Error during AI categorization"
        );

        // Return error response (no fallback)
        reply.code(500);
        throw new Error(`Categorization failed: ${errorMessage}`);
      }
    }
  );
}
