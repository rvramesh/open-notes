/**
 * Settings manager for server-side configuration
 * 
 * Provides a singleton instance to access server configuration
 */

import { FileSystemSettingsAdapter, DEFAULT_SETTINGS, extractServerConfig, validateServerConfig } from './adapters/FileSystemSettingsAdapter.js';
import type { ServerConfig, Settings } from './adapters/FileSystemSettingsAdapter.js';

/**
 * Settings manager class
 */
export class SettingsManager {
  private static instance: SettingsManager | null = null;
  private config: ServerConfig;
  private adapter: FileSystemSettingsAdapter;
  private isLoaded = false;

  private constructor(adapter?: FileSystemSettingsAdapter) {
    this.adapter = adapter || new FileSystemSettingsAdapter();
    // Initialize with defaults
    this.config = extractServerConfig(DEFAULT_SETTINGS);
  }

  /**
   * Get singleton instance
   */
  static getInstance(adapter?: FileSystemSettingsAdapter): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager(adapter);
    }
    return SettingsManager.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    SettingsManager.instance = null;
  }

  /**
   * Load settings from file system
   */
  async load(): Promise<void> {
    try {
      const config = await this.adapter.loadServerConfig();
      
      if (validateServerConfig(config)) {
        this.config = config;
        this.isLoaded = true;
      } else {
        throw new Error('Invalid server configuration');
      }
    } catch (error) {
      console.error('Failed to load settings, using defaults:', error);
      // Use defaults on error
      this.config = extractServerConfig(DEFAULT_SETTINGS);
      this.isLoaded = true;
    }
  }

  /**
   * Get current server configuration
   * Ensures settings are loaded before returning
   */
  async getConfig(): Promise<ServerConfig> {
    if (!this.isLoaded) {
      await this.load();
    }
    return { ...this.config }; // Return copy to prevent mutations
  }

  /**
   * Get current server configuration synchronously
   * WARNING: Only use after load() has been called
   */
  getConfigSync(): ServerConfig {
    if (!this.isLoaded) {
      throw new Error('Settings not loaded. Call load() first or use getConfig() instead.');
    }
    return { ...this.config };
  }

  /**
   * Reload settings from file system
   */
  async reload(): Promise<void> {
    this.isLoaded = false;
    await this.load();
  }

  /**
   * Save settings to file system
   */
  async save(settings: Settings): Promise<void> {
    await this.adapter.save(settings);
    // Update in-memory config after successful save
    this.config = extractServerConfig(settings);
  }

  /**
   * Update server configuration (partial update)
   */
  async updateConfig(updates: Partial<ServerConfig>): Promise<void> {
    // Load current full settings
    const currentSettings = await this.adapter.load();
    
    // Merge updates
    const updatedSettings: Settings = {
      ...currentSettings,
      ...updates,
    };
    
    // Save back to filesystem
    await this.save(updatedSettings);
  }

  /**
   * Check if settings have been loaded
   */
  isSettingsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get settings file path
   */
  getSettingsPath(): string {
    return this.adapter.getPath();
  }

  /**
   * Get the adapter instance (for advanced operations)
   */
  getAdapter(): FileSystemSettingsAdapter {
    return this.adapter;
  }
}

/**
 * Get settings manager singleton
 */
export function getSettingsManager(adapter?: FileSystemSettingsAdapter): SettingsManager {
  return SettingsManager.getInstance(adapter);
}
