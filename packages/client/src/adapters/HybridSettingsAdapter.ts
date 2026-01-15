/**
 * Hybrid settings persistence adapter
 * 
 * Combines LocalStorage (client-side) with server sync capability
 * Settings are persisted both locally and on the server
 */

import { getApiBaseUrl, ensureInitialized } from '../api';
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

  constructor() {
    // Uses dynamic API base URL from api.ts
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
        // Emit custom event for toast notification
        window.dispatchEvent(new CustomEvent('api-error', { 
          detail: { message: 'Failed to sync settings to server', error: serverError } 
        }));
        // Don't throw - local save succeeded
      }
    } catch (error) {
      const message = `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      window.dispatchEvent(new CustomEvent('api-error', { detail: { message, error } }));
      throw new Error(message);
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
      console.error('Failed to load settings:', error);
      // Return null instead of throwing to allow graceful fallback to defaults
      return null;
    }
  }

  /**
   * Sync settings to server
   */
  private async syncToServer(settings: StorageSettings): Promise<void> {
    await ensureInitialized();
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync settings to server: ${response.statusText}`);
    }
  }

  /**
   * Load settings from server
   */
  private async loadFromServer(): Promise<SettingsStoreState | null> {
    try {
      await ensureInitialized();
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/settings`);
      if (!response.ok) {
        console.warn(`Failed to load settings from server: ${response.status} ${response.statusText}`);
        window.dispatchEvent(new CustomEvent('api-error', { 
          detail: { message: `Failed to load settings from server: ${response.statusText}` } 
        }));
        return null;
      }
      const settings = await response.json() as StorageSettings;
      return this.toStoreState(settings);
    } catch (error) {
      console.error('Error loading settings from server:', error);
      window.dispatchEvent(new CustomEvent('api-error', { 
        detail: { message: 'Error loading settings from server', error } 
      }));
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
