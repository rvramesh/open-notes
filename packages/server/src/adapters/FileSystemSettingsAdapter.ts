/**
 * File system-based settings persistence adapter for server-side
 * 
 * Stores settings in a JSON file on the file system
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

/**
 * Types from shared package - duplicated here to avoid circular dependency
 * TODO: Export from @open-notes/shared once npm properly resolves workspace packages
 */

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface ModelConfiguration {
  provider: AIProvider;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  enrichmentPrompt: string;
  noEnrichment?: boolean;
}

export interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number;
}

export interface Settings {
  theme: string;
  fontSize: string;
  languageModel?: ModelConfiguration;
  embeddingModel?: ModelConfiguration;
  categories: Category[];
  genericEnrichmentPrompt: string;
  categoryRecognitionPrompt: string;
  editorSettings: EditorSettings;
  lastSavedAt?: number;
}

export interface ServerConfig {
  languageModel?: ModelConfiguration;
  embeddingModel?: ModelConfiguration;
  categories: Category[];
  genericEnrichmentPrompt: string;
  categoryRecognitionPrompt: string;
}

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

export function extractServerConfig(settings: Settings): ServerConfig {
  return {
    languageModel: settings.languageModel,
    embeddingModel: settings.embeddingModel,
    categories: settings.categories,
    genericEnrichmentPrompt: settings.genericEnrichmentPrompt,
    categoryRecognitionPrompt: settings.categoryRecognitionPrompt,
  };
}

export function validateServerConfig(config: Partial<ServerConfig>): config is ServerConfig {
  return (
    Array.isArray(config.categories) &&
    typeof config.genericEnrichmentPrompt === 'string' &&
    typeof config.categoryRecognitionPrompt === 'string'
  );
}

/**
 * File system adapter for settings persistence
 */
export class FileSystemSettingsAdapter {
  private readonly settingsPath: string;

  constructor(settingsPath?: string) {
    // Default to user's home directory if not specified
    this.settingsPath = settingsPath || join(homedir(), '.open-notes', 'settings.json');
  }

  /**
   * Save settings to file system
   */
  async save(settings: Settings): Promise<void> {
    try {
      // Ensure directory exists
      await mkdir(dirname(this.settingsPath), { recursive: true });

      // Save settings with pretty formatting
      await writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save settings to ${this.settingsPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load settings from file system
   */
  async load(): Promise<Settings> {
    try {
      const json = await readFile(this.settingsPath, 'utf-8');
      const loaded = JSON.parse(json) as Partial<Settings>;
      
      // Merge with defaults to ensure all fields are present
      return {
        ...DEFAULT_SETTINGS,
        ...loaded,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return defaults
        return { ...DEFAULT_SETTINGS };
      }
      throw new Error(
        `Failed to load settings from ${this.settingsPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load server config specifically (subset of settings)
   */
  async loadServerConfig(): Promise<ServerConfig> {
    const settings = await this.load();
    return extractServerConfig(settings);
  }

  /**
   * Check if settings file exists
   */
  async exists(): Promise<boolean> {
    try {
      await readFile(this.settingsPath, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get settings file path
   */
  getPath(): string {
    return this.settingsPath;
  }
}
