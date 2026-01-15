/**
 * File system-based settings persistence adapter for server-side
 * 
 * Stores settings in a JSON file on the file system
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { Settings, ServerConfig } from '@open-notes/shared/settings-types';
import { DEFAULT_SETTINGS, extractServerConfig, validateServerConfig } from '@open-notes/shared/settings-types';

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
