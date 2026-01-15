/**
 * Hook for using the settings store
 * 
 * Provides a singleton instance of the settings store with hybrid (localStorage + server) persistence.
 */

import { createSettingsStore } from '../stores/settings.store';
import { HybridSettingsAdapter } from '../adapters/HybridSettingsAdapter';
import type { SettingsStore } from '../stores';

/**
 * Global settings store instance (lazy initialized)
 */
let settingsStoreInstance: ReturnType<typeof createSettingsStore> | null = null;

/**
 * Initialize the settings store with hybrid adapter (localStorage + server)
 * Call this once at app startup
 */
export const initializeSettingsStore = () => {
  if (!settingsStoreInstance) {
    const adapter = new HybridSettingsAdapter();
    settingsStoreInstance = createSettingsStore(adapter);
  }
  return settingsStoreInstance;
};

/**
 * Get the settings store instance
 * Must call initializeSettingsStore() first
 */
export const getSettingsStore = () => {
  if (!settingsStoreInstance) {
    throw new Error('Settings store not initialized. Call initializeSettingsStore() at app startup.');
  }
  return settingsStoreInstance;
};

/**
 * Hook to use the entire settings store
 * 
 * Usage:
 * ```tsx
 * const settings = useSettings();
 * settings.theme; // 'light' | 'dark' | 'system'
 * await settings.setTheme('dark');
 * ```
 */
export const useSettings = (): SettingsStore => {
  const store = getSettingsStore();
  // Call the Zustand hook to get the state
  return store();
};

/**
 * Hook to select specific settings values
 * 
 * Usage:
 * ```tsx
 * const theme = useSettingsValue(s => s.theme);
 * const categories = useSettingsValue(s => s.categories);
 * ```
 */
export const useSettingsValue = <T,>(selector: (state: SettingsStore) => T): T => {
  const store = useSettings();
  // Note: This is a simplified version. For production, use shallow selectors
  // or subscribe to prevent unnecessary re-renders
  const value = selector(store);
  return value;
};

/**
 * Hook to load settings from storage
 * Call this once at app startup
 * 
 * Usage:
 * ```tsx
 * useEffect(() => {
 *   loadSettingsFromStorage();
 * }, []);
 * ```
 */
export const useLoadSettings = () => {
  const store = useSettings();
  
  const load = async () => {
    try {
      await store.load();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  return load;
};
