import type { Note, NoteId, Timestamp } from '../lib/types';

/**
 * Persistence adapter interface for notes.
 * Allows different storage backends (localStorage, IndexedDB, filesystem, remote server)
 * while maintaining consistent behavior.
 */
export interface NotesPersistenceAdapter {
  /**
   * Generate a permanent note ID from a temporary ID.
   * The adapter controls the ID generation strategy (ULID, UUID, timestamp, etc.)
   * 
   * @param timestamp - Creation timestamp in milliseconds
   * @param tempId - Temporary ID assigned by the store
   * @returns Promise resolving to tempId and permanent noteId mapping
   */
  generateNoteId(
    timestamp: Timestamp,
    tempId: string
  ): Promise<{
    tempId: string;
    noteId: NoteId;
  }>;

  /**
   * Fetch all notes from persistence layer.
   * 
   * @returns Promise resolving to array of all notes
   */
  fetchAllNotes(): Promise<Note[]>;

  /**
   * Create a new note in persistence layer.
   * 
   * @param note - The note to create (with permanent ID)
   * @returns Promise that resolves when creation is complete
   */
  createNote(note: Note): Promise<void>;

  /**
   * Update an existing note in persistence layer.
   * Note is persisted as an aggregate (entire object), not as deltas.
   * 
   * @param note - The updated note (with permanent ID)
   * @returns Promise that resolves when update is complete
   */
  updateNote(note: Note): Promise<void>;

  /**
   * Delete a note from persistence layer.
   * 
   * @param noteId - The ID of the note to delete
   * @returns Promise that resolves when deletion is complete
   */
  deleteNote(noteId: NoteId): Promise<void>;
}
