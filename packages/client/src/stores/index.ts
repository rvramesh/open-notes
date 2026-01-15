/**
 * Store exports for Open Notes
 * 
 * This file provides centralized exports for all Zustand stores.
 */

// Notes store
export { createNotesStore } from './notes.store';
export type { NotesStore, NotesStoreState, NotesStoreActions } from './notes.store';

// Settings store
export { createSettingsStore, PREDEFINED_CATEGORIES } from './settings.store';
export type { SettingsStore } from './settings.store';
export type { SettingsStoreState, SettingsStoreActions } from '../lib/settings-types';

// Adapters
export { LocalStorageNotesAdapter } from '../adapters/LocalStorageNotesAdapter';
export type { NotesPersistenceAdapter } from '../adapters/NotesPersistenceAdapter';

export { LocalStorageSettingsAdapter } from '../adapters/LocalStorageSettingsAdapter';
export type { SettingsPersistenceAdapter } from '../adapters/SettingsPersistenceAdapter';

// Settings types
export type {
  ThemePreference,
  FontSize,
  AIProvider,
  ModelConfiguration,
  Category,
  EditorSettings,
} from '../lib/settings-types';
