import { ulid } from 'ulid';
import type { Note, NoteId, Timestamp } from '../lib/types';
import type { NotesPersistenceAdapter } from './NotesPersistenceAdapter';

/**
 * LocalStorage-based persistence adapter for notes.
 * Uses ULID for lexically sortable, globally unique note IDs.
 */
export class LocalStorageNotesAdapter implements NotesPersistenceAdapter {
  private readonly storageKey = 'open-notes:notes';

  /**
   * Generate a ULID-based note ID.
   * ULIDs are lexically sortable and encode the timestamp in the first 48 bits.
   */
  async generateNoteId(
    timestamp: Timestamp,
    tempId: string
  ): Promise<{ tempId: string; noteId: NoteId }> {
    // Generate ULID with the provided timestamp
    const noteId = ulid(timestamp);
    return { tempId, noteId };
  }

  /**
   * Fetch all notes from localStorage.
   */
  async fetchAllNotes(): Promise<Note[]> {
    try {
      const json = localStorage.getItem(this.storageKey);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('Failed to fetch notes from localStorage:', error);
      return [];
    }
  }

  /**
   * Create a new note in localStorage.
   */
  async createNote(note: Note): Promise<void> {
    try {
      const notes = await this.fetchAllNotes();
      notes.push(note);
      localStorage.setItem(this.storageKey, JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to create note in localStorage:', error);
      throw new Error('Failed to create note');
    }
  }

  /**
   * Update an existing note in localStorage.
   */
  async updateNote(note: Note): Promise<void> {
    try {
      const notes = await this.fetchAllNotes();
      const index = notes.findIndex((n) => n.id === note.id);
      
      if (index >= 0) {
        notes[index] = note;
        localStorage.setItem(this.storageKey, JSON.stringify(notes));
      } else {
        throw new Error(`Note with id ${note.id} not found`);
      }
    } catch (error) {
      console.error('Failed to update note in localStorage:', error);
      throw new Error('Failed to update note');
    }
  }

  /**
   * Delete a note from localStorage.
   */
  async deleteNote(noteId: NoteId): Promise<void> {
    try {
      const notes = await this.fetchAllNotes();
      const filtered = notes.filter((n) => n.id !== noteId);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete note from localStorage:', error);
      throw new Error('Failed to delete note');
    }
  }
}
