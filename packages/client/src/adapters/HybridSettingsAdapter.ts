/**
 * Hybrid settings persistence adapter
 * 
 * Combines LocalStorage (client-side) with server sync capability
 * Settings are persisted both locally and on the server
 */

import type { SettingsStoreState } from '../lib/settings-types';
import type { SettingsPersistenceAdapter } from '../lib/settings-types';

/**
 * Settings serialized form (for storage)
 */
type StorageSettings = Omit<SettingsStoreState, 'adapter' | 'isLoading' | 'error'> & { lastSavedAt: number };

/**
 * Hybrid adapter for settings persistence (local + server)
 */
export class HybridSettingsAdapter implements SettingsPersistenceAdapter {
  private readonly storageKey = 'open-notes:settings';
  private readonly serverUrl: string;

  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * Save settings to both localStorage and server
   */
  async save(settings: SettingsStoreState): Promise<void> {
    const cleanSettings: StorageSettings = {
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

    try {
      // Save to localStorage first (immediate)
      localStorage.setItem(this.storageKey, JSON.stringify(cleanSettings));

      // Try to sync with server (best effort, don't fail if server is down)
      try {
        await this.syncToServer(cleanSettings);
      } catch (serverError) {
        console.warn('Failed to sync settings to server:', serverError);
        // Don't throw - local save succeeded
      }
    } catch (error) {
      throw new Error(
        `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load settings from localStorage with optional server sync
   */
  async load(): Promise<SettingsStoreState | null> {
    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) {
        // Try to load from server if local storage is empty
        return await this.loadFromServer();
      }

      const loaded = JSON.parse(json) as StorageSettings;
      return this.toStoreState(loaded);
    } catch (error) {
      throw new Error(
        `Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sync settings to server
   */
  private async syncToServer(settings: StorageSettings): Promise<void> {
    // For now, we just log - implement actual sync endpoint later
    console.log('Settings synced to server (placeholder)');
    // Future implementation:
    // await fetch(`${this.serverUrl}/api/settings/sync`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(settings),
    // });
  }

  /**
   * Load settings from server
   */
  private async loadFromServer(): Promise<SettingsStoreState | null> {
    try {
      const response = await fetch(`${this.serverUrl}/api/settings`);
      if (!response.ok) {
        return null;
      }
      const settings = await response.json() as StorageSettings;
      return this.toStoreState(settings);
    } catch {
      return null;
    }
  }

  /**
   * Convert StorageSettings to SettingsStoreState
   */
  private toStoreState(settings: StorageSettings): SettingsStoreState {
    return {
      ...settings,
      adapter: undefined,
      isLoading: false,
      error: null,
    };
  }

  /**
   * Clear all settings from localStorage
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      throw new Error(
        `Failed to clear settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
