import { createNotesStore, LocalStorageNotesAdapter } from '@/stores';
import { createCategoriesStore } from '@/stores/categories.store';
import { createTagsStore } from '@/stores/tags.store';
import { LocalStorageCategoriesAdapter } from '@/adapters/LocalStorageCategoriesAdapter';
import { LocalStorageTagsAdapter } from '@/adapters/LocalStorageTagsAdapter';

/**
 * Global notes store instance
 * Created once with LocalStorage adapter
 */
const notesAdapter = new LocalStorageNotesAdapter();
export const useNotesStore = createNotesStore(notesAdapter);

/**
 * Global categories store instance
 */
const categoriesAdapter = new LocalStorageCategoriesAdapter();
export const useCategoriesStore = createCategoriesStore(categoriesAdapter);

/**
 * Global tags store instance
 */
const tagsAdapter = new LocalStorageTagsAdapter();
export const useTagsStore = createTagsStore(tagsAdapter);

