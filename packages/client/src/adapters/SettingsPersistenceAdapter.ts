/**
 * Settings persistence adapter interface
 * 
 * Defines the contract for storing and loading application settings.
 * Different implementations can target localStorage, IndexedDB, server APIs, etc.
 */

import type {
  SettingsStoreState,
  SettingsPersistenceAdapter,
} from '../lib/settings-types';

export type { SettingsPersistenceAdapter };

/**
 * Base class for settings persistence adapters
 */
export abstract class BaseSettingsPersistenceAdapter
  implements SettingsPersistenceAdapter
{
  abstract save(settings: SettingsStoreState): Promise<void>;
  abstract load(): Promise<SettingsStoreState | null>;
}
