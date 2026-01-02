/**
 * Store exports for Open Notes
 * 
 * This file provides centralized exports for all Zustand stores.
 */

// Notes store
export { createNotesStore } from './notes.store';
export type { NotesStore, NotesStoreState, NotesStoreActions } from './notes.store';

// Adapters
export { LocalStorageNotesAdapter } from '../adapters/LocalStorageNotesAdapter';
export type { NotesPersistenceAdapter } from '../adapters/NotesPersistenceAdapter';
