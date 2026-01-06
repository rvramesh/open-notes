import { create } from 'zustand';
import type { Note, NoteId, Block, Embedding } from '../lib/types';
import type { NotesPersistenceAdapter } from '../adapters/NotesPersistenceAdapter';

/**
 * Notes store state interface
 */
interface NotesStoreState {
  // Data
  notes: Record<NoteId, Note>; // Map for O(1) lookups
  orderedNoteIds: NoteId[]; // Lexically sorted for display

  // Dependencies (injected)
  adapter: NotesPersistenceAdapter;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

/**
 * Notes store actions interface
 */
interface NotesStoreActions {
  // CRUD operations
  createNote(initialData?: Partial<Note>): Promise<NoteId>;
  updateNote(id: NoteId, updater: (note: Note) => Note): Promise<void>;
  deleteNote(id: NoteId): Promise<void>;

  // Batch operations
  batchUpdateNotes(
    updates: Array<[NoteId, (note: Note) => Note]>
  ): Promise<void>;

  // Enrichment operations
  replaceEnrichments(id: NoteId, enrichmentBlocks: Block[]): Promise<void>;
  clearEnrichments(id: NoteId): Promise<void>;

  // Embeddings
  setEmbeddings(id: NoteId, embeddings: Embedding[]): Promise<void>;
  clearEmbeddings(id: NoteId): Promise<void>;

  // Lifecycle
  hydrate(notes: Note[]): void;
  refreshFromAdapter(): Promise<void>;

  // Queries (read-only, derived)
  getNote(id: NoteId): Note | undefined;
  getNotesByCategory(categoryId: string): Note[];
  getNotesByTag(tag: string): Note[];
  getRecentNotes(limit?: number): Note[];
}

/**
 * Combined store type
 */
type NotesStore = NotesStoreState & NotesStoreActions;

/**
 * Create the notes store with the provided adapter.
 * 
 * @param adapter - The persistence adapter to use
 * @returns Zustand store hook
 */
export const createNotesStore = (adapter: NotesPersistenceAdapter) => {
  return create<NotesStore>((set, get) => ({
    // Initial state
    notes: {},
    orderedNoteIds: [],
    adapter,
    isLoading: false,
    error: null,

    // Create note with optimistic updates
    createNote: async (initialData?: Partial<Note>): Promise<NoteId> => {
      const now = Date.now();
      const tempId = `temp-${now}-${Math.random().toString(36).substr(2, 9)}`;

      // Create note with temporary ID
      const tempNote: Note = {
        id: tempId,
        title: initialData?.title || 'Untitled Note',
        createdAt: now,
        updatedAt: now,
        contentBlocks: initialData?.contentBlocks || [],
        enrichmentBlocks: [],
        category: initialData?.category,
        tags: initialData?.tags || { user: [], system: [] },
        embeddings: initialData?.embeddings,
        ...initialData,
      };

      // Insert with tempId (optimistic update)
      set((state) => ({
        notes: { ...state.notes, [tempId]: tempNote },
        orderedNoteIds: [...state.orderedNoteIds, tempId].sort(),
      }));

      try {
        // Get real ID from adapter
        const { noteId } = await get().adapter.generateNoteId(now, tempId);

        // Create final note with real ID
        const note: Note = { ...tempNote, id: noteId };

        // Replace tempId with real noteId in store
        set((state) => {
          const { [tempId]: removed, ...remainingNotes } = state.notes;
          return {
            notes: { ...remainingNotes, [noteId]: note },
            orderedNoteIds: state.orderedNoteIds
              .filter((id) => id !== tempId)
              .concat(noteId)
              .sort(),
          };
        });

        // Persist with real noteId
        await get().adapter.createNote(note);

        return noteId;
      } catch (error) {
        // Rollback on error - remove temp note
        set((state) => {
          const { [tempId]: removed, ...remainingNotes } = state.notes;
          return {
            notes: remainingNotes,
            orderedNoteIds: state.orderedNoteIds.filter((id) => id !== tempId),
            error: error instanceof Error ? error.message : 'Failed to create note',
          };
        });
        throw error;
      }
    },

    // Update note immutably
    updateNote: async (
      id: NoteId,
      updater: (note: Note) => Note
    ): Promise<void> => {
      const currentNote = get().notes[id];
      if (!currentNote) {
        throw new Error(`Note ${id} not found`);
      }

      try {
        // Apply update immutably
        const updatedNote: Note = {
          ...updater(currentNote),
          updatedAt: Date.now(),
        };

        // Update local state
        set((state) => ({
          notes: { ...state.notes, [id]: updatedNote },
        }));

        // Persist
        await get().adapter.updateNote(updatedNote);
      } catch (error) {
        // Rollback on error
        set((state) => ({
          notes: { ...state.notes, [id]: currentNote },
          error: error instanceof Error ? error.message : 'Failed to update note',
        }));
        throw error;
      }
    },

    // Delete note
    deleteNote: async (id: NoteId): Promise<void> => {
      const noteToDelete = get().notes[id];
      if (!noteToDelete) {
        throw new Error(`Note ${id} not found`);
      }

      try {
        // Remove from local state
        set((state) => {
          const { [id]: deleted, ...remainingNotes } = state.notes;
          return {
            notes: remainingNotes,
            orderedNoteIds: state.orderedNoteIds.filter((nid) => nid !== id),
          };
        });

        // Persist deletion
        await get().adapter.deleteNote(id);
      } catch (error) {
        // Rollback on error
        set((state) => ({
          notes: { ...state.notes, [id]: noteToDelete },
          orderedNoteIds: [...state.orderedNoteIds, id].sort(),
          error: error instanceof Error ? error.message : 'Failed to delete note',
        }));
        throw error;
      }
    },

    // Batch update notes
    batchUpdateNotes: async (
      updates: Array<[NoteId, (note: Note) => Note]>
    ): Promise<void> => {
      const now = Date.now();
      const updatedNotes: Record<NoteId, Note> = {};
      const originalNotes: Record<NoteId, Note> = {};

      try {
        // Prepare all updates
        for (const [id, updater] of updates) {
          const currentNote = get().notes[id];
          if (!currentNote) {
            throw new Error(`Note ${id} not found`);
          }
          originalNotes[id] = currentNote;
          updatedNotes[id] = {
            ...updater(currentNote),
            updatedAt: now,
          };
        }

        // Apply all updates to local state
        set((state) => ({
          notes: { ...state.notes, ...updatedNotes },
        }));

        // Persist all updates
        await Promise.all(
          Object.values(updatedNotes).map((note) =>
            get().adapter.updateNote(note)
          )
        );
      } catch (error) {
        // Rollback on error
        set((state) => ({
          notes: { ...state.notes, ...originalNotes },
          error:
            error instanceof Error ? error.message : 'Failed to batch update notes',
        }));
        throw error;
      }
    },

    // Replace enrichment blocks
    replaceEnrichments: async (
      id: NoteId,
      enrichmentBlocks: Block[]
    ): Promise<void> => {
      await get().updateNote(id, (note) => ({
        ...note,
        enrichmentBlocks,
      }));
    },

    // Clear enrichment blocks
    clearEnrichments: async (id: NoteId): Promise<void> => {
      await get().updateNote(id, (note) => ({
        ...note,
        enrichmentBlocks: [],
      }));
    },

    // Set embeddings
    setEmbeddings: async (
      id: NoteId,
      embeddings: Embedding[]
    ): Promise<void> => {
      await get().updateNote(id, (note) => ({
        ...note,
        embeddings,
      }));
    },

    // Clear embeddings
    clearEmbeddings: async (id: NoteId): Promise<void> => {
      await get().updateNote(id, (note) => {
        const { embeddings, ...rest } = note;
        return rest;
      });
    },

    // Hydrate store with notes
    hydrate: (notes: Note[]): void => {
      const notesMap: Record<NoteId, Note> = {};
      const orderedIds: NoteId[] = [];

      // Build map and sorted list
      notes.forEach((note) => {
        notesMap[note.id] = note;
        orderedIds.push(note.id);
      });

      // Lexical sort (string comparison)
      orderedIds.sort();

      set({
        notes: notesMap,
        orderedNoteIds: orderedIds,
        isLoading: false,
        error: null,
      });
    },

    // Refresh from adapter
    refreshFromAdapter: async (): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        const notes = await get().adapter.fetchAllNotes();
        get().hydrate(notes);
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to refresh notes from adapter',
          isLoading: false,
        });
        throw error;
      }
    },

    // Query: Get note by ID
    getNote: (id: NoteId): Note | undefined => {
      return get().notes[id];
    },

    // Query: Get notes by category
    getNotesByCategory: (categoryId: string): Note[] => {
      return Object.values(get().notes).filter((note) =>
        note.category === categoryId
      );
    },

    // Query: Get notes by tag
    getNotesByTag: (tag: string): Note[] => {
      return Object.values(get().notes).filter(
        (note) =>
          note.tags.user.includes(tag) || note.tags.system.includes(tag)
      );
    },

    // Query: Get recent notes
    getRecentNotes: (limit: number = 10): Note[] => {
      const sortedNotes = [...get().orderedNoteIds]
        .map((id) => get().notes[id])
        .filter((note): note is Note => note !== undefined)
        .sort((a, b) => b.updatedAt - a.updatedAt);

      return sortedNotes.slice(0, limit);
    },
  }));
};

/**
 * Export the store type for use in components
 */
export type { NotesStore, NotesStoreState, NotesStoreActions };
