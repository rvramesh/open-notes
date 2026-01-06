/**
 * LocalStorage-based settings persistence adapter
 * 
 * Stores settings in browser LocalStorage. Suitable for single-user web apps
 * and Electron apps using LocalStorage polyfills.
 */

import type {
  SettingsStoreState,
  SettingsPersistenceAdapter,
} from '../lib/settings-types';

/**
 * LocalStorage adapter for settings persistence
 */
export class LocalStorageSettingsAdapter implements SettingsPersistenceAdapter {
  private readonly storageKey = 'open-notes:settings';

  /**
   * Save settings to localStorage
   */
  async save(settings: SettingsStoreState): Promise<void> {
    try {
      const cleanSettings = {
        theme: settings.theme,
        fontSize: settings.fontSize,
        languageModel: settings.languageModel,
        embeddingModel: settings.embeddingModel,
        categories: settings.categories,
        genericEnrichmentPrompt: settings.genericEnrichmentPrompt,
        categoryRecognitionPrompt: settings.categoryRecognitionPrompt,
        editorSettings: settings.editorSettings,
        lastSavedAt: Date.now(),
      };

      localStorage.setItem(this.storageKey, JSON.stringify(cleanSettings));
    } catch (error) {
      throw new Error(
        `Failed to save settings to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load settings from localStorage
   */
  async load(): Promise<SettingsStoreState | null> {
    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) {
        // Try to migrate from old categories storage
        return this.migrateFromOldStorage();
      }

      const loaded = JSON.parse(json);
      return {
        ...loaded,
        adapter: undefined, // Will be injected later
        isLoading: false,
        error: null,
      };
    } catch (error) {
      throw new Error(
        `Failed to load settings from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Migrate categories from old storage format to new settings format
   */
  private async migrateFromOldStorage(): Promise<SettingsStoreState | null> {
    try {
      const oldCategoriesJson = localStorage.getItem('open-notes:categories');
      if (!oldCategoriesJson) {
        return null;
      }

      const oldCategories = JSON.parse(oldCategoriesJson);
      
      // Convert old category format (aiPrompt) to new format (enrichmentPrompt + noEnrichment)
      const migratedCategories = oldCategories.map((cat: { id: string; name: string; color: string; aiPrompt?: string; enrichmentPrompt?: string; noEnrichment?: boolean }) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        enrichmentPrompt: cat.enrichmentPrompt || cat.aiPrompt || '',
        noEnrichment: cat.noEnrichment || false,
      }));

      // Return partial state with migrated categories
      // Other settings will use defaults
      return {
        categories: migratedCategories,
        adapter: undefined,
        isLoading: false,
        error: null,
      } as SettingsStoreState;
    } catch (error) {
      console.error('Failed to migrate old categories:', error);
      return null;
    }
  }

  /**
   * Clear all settings from localStorage
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      throw new Error(
        `Failed to clear settings from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
