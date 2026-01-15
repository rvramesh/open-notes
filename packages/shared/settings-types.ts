/**
 * Shared settings type definitions
 * Used by both client and server
 */

/**
 * Theme preference
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Font size preference
 */
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * AI model provider
 */
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

/**
 * Color name for categories
 */
export type ColorName =
  | 'rose'
  | 'pink'
  | 'fuchsia'
  | 'purple'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'sky'
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'green'
  | 'lime'
  | 'yellow'
  | 'amber'
  | 'orange'
  | 'red'
  | 'warmGray'
  | 'coolGray'
  | 'slate';

/**
 * AI model configuration
 */
export interface ModelConfiguration {
  provider: AIProvider;
  modelName: string; // e.g., 'gpt-4', 'claude-3-opus', 'llama2'
  baseUrl?: string; // Optional custom API endpoint
  apiKey?: string; // Optional API key (encrypted or environment-based)
}

/**
 * Category with enrichment prompt
 */
export interface Category {
  id: string;
  name: string;
  color: ColorName;
  enrichmentPrompt: string; // Prompt used to enrich notes in this category
  noEnrichment?: boolean; // If true, this is a manual category without AI enrichment
}

/**
 * Editor preferences
 */
export interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number; // seconds - time to wait after last keystroke before saving
}

/**
 * Server-side settings configuration (subset of full settings)
 * This is what the server needs to function
 */
export interface ServerConfig {
  // AI configuration
  languageModel?: ModelConfiguration;
  embeddingModel?: ModelConfiguration;

  // Categories for AI classification
  categories: Category[];

  // AI prompts (global defaults)
  genericEnrichmentPrompt: string;
  categoryRecognitionPrompt: string;
}

/**
 * Full settings state (client + server)
 */
export interface Settings {
  // Appearance (client-only)
  theme: ThemePreference;
  fontSize: FontSize;

  // AI configuration (shared)
  languageModel?: ModelConfiguration;
  embeddingModel?: ModelConfiguration;

  // Categories (shared)
  categories: Category[];

  // AI prompts (shared)
  genericEnrichmentPrompt: string;
  categoryRecognitionPrompt: string;

  // Editor preferences (client-only)
  editorSettings: EditorSettings;

  // Metadata
  lastSavedAt?: number;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  fontSize: 'md',
  categories: [],
  genericEnrichmentPrompt: 'Enhance the note with relevant context, insights, and connections. Never modify the original intent or meaning—only add valuable insights.',
  categoryRecognitionPrompt: `Analyze the note and determine which category it belongs to. Consider:
- Main topic and subject matter
- Keywords and terminology
- Context and purpose
- Related concepts

Return the category ID that best matches the note's content.

Available categories:
{% for category in categories %}
- {{ category.name }} ({{ category.id }}): {{ category.enrichmentPrompt }}
{% endfor %}`,
  editorSettings: {
    autoSave: true,
    autoSaveInterval: 10,
  },
};

/**
 * Extract server config from full settings
 */
export function extractServerConfig(settings: Settings): ServerConfig {
  return {
    languageModel: settings.languageModel,
    embeddingModel: settings.embeddingModel,
    categories: settings.categories,
    genericEnrichmentPrompt: settings.genericEnrichmentPrompt,
    categoryRecognitionPrompt: settings.categoryRecognitionPrompt,
  };
}

/**
 * Validate server config
 */
export function validateServerConfig(config: Partial<ServerConfig>): config is ServerConfig {
  return (
    Array.isArray(config.categories) &&
    typeof config.genericEnrichmentPrompt === 'string' &&
    typeof config.categoryRecognitionPrompt === 'string'
  );
}
