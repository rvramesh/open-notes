/**
 * Settings-related type definitions
 */

import type { Timestamp, ColorName } from './types';

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
 * Settings persistence adapter interface
 */
export interface SettingsPersistenceAdapter {
  save(settings: SettingsStoreState): Promise<void>;
  load(): Promise<SettingsStoreState | null>;
}

/**
 * Settings store state
 */
export interface SettingsStoreState {
  // Appearance
  theme: ThemePreference;
  fontSize: FontSize;

  // AI configuration
  languageModel?: ModelConfiguration;
  embeddingModel?: ModelConfiguration;

  // Categories
  categories: Category[];

  // AI prompts (global defaults)
  genericEnrichmentPrompt: string;
  categoryRecognitionPrompt: string;

  // Editor preferences
  editorSettings: EditorSettings;

  // Persistence adapter reference
  adapter?: SettingsPersistenceAdapter;

  // Loading state
  isLoading: boolean;
  error: string | null;
  lastSavedAt?: Timestamp;
}

/**
 * Settings store actions
 */
export interface SettingsStoreActions {
  // Appearance
  setTheme(theme: ThemePreference): Promise<void>;
  setFontSize(size: FontSize): Promise<void>;

  // AI configuration
  setLanguageModel(model: ModelConfiguration): Promise<void>;
  setEmbeddingModel(model: ModelConfiguration): Promise<void>;
  clearLanguageModel(): Promise<void>;
  clearEmbeddingModel(): Promise<void>;

  // Categories
  createCategory(
    name: string,
    color: Category['color'],
    prompt: string
  ): Promise<string>;
  updateCategory(id: string, updates: Partial<Category>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Category | undefined;
  getCategoryByName(name: string): Category | undefined;

  // Prompts
  setGenericEnrichmentPrompt(prompt: string): Promise<void>;
  setCategoryRecognitionPrompt(prompt: string): Promise<void>;

  // Editor settings
  setEditorSetting(
    key: keyof EditorSettings,
    value: boolean | number
  ): Promise<void>;

  // Lifecycle
  load(): Promise<void>;
  save(): Promise<void>;
  resetToDefaults(): void;
}
