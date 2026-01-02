import { createNotesStore, LocalStorageNotesAdapter } from '@/stores';

/**
 * Global notes store instance
 * Created once with LocalStorage adapter
 */
const adapter = new LocalStorageNotesAdapter();
export const useNotesStore = createNotesStore(adapter);
