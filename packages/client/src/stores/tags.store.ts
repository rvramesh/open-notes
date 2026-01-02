import { create } from 'zustand';
import type { Tag } from '../lib/types';
import type { TagsPersistenceAdapter } from '../adapters/TagsPersistenceAdapter';
import { normalizeTag, getTagColor } from '../lib/tag-utils';

interface TagsStoreState {
  tags: Set<string>; // Denormalized collection of tag strings
  adapter: TagsPersistenceAdapter;
  isLoading: boolean;
  error: string | null;
}

interface TagsStoreActions {
  addTag(name: string): Promise<string>;
  removeTag(tag: string): Promise<void>;
  getAllTags(): Tag[];
  hasTag(tag: string): boolean;
  hydrate(tags: string[]): void;
  refreshFromAdapter(): Promise<void>;
}

type TagsStore = TagsStoreState & TagsStoreActions;

export function createTagsStore(adapter: TagsPersistenceAdapter) {
  return create<TagsStore>((set, get) => ({
    // State
    tags: new Set<string>(),
    adapter,
    isLoading: false,
    error: null,

    // Add a tag (normalized)
    addTag: async (name: string): Promise<string> => {
      const normalizedTag = normalizeTag(name);
      
      // Add to local state
      set(state => ({
        tags: new Set(state.tags).add(normalizedTag),
      }));

      // Persist
      const allTags = Array.from(get().tags);
      await get().adapter.saveTags(allTags);

      return normalizedTag;
    },

    // Remove tag
    removeTag: async (tag: string): Promise<void> => {
      const normalizedTag = normalizeTag(tag);
      
      // Remove from local state
      set(state => {
        const newTags = new Set(state.tags);
        newTags.delete(normalizedTag);
        return { tags: newTags };
      });

      // Persist
      const allTags = Array.from(get().tags);
      await get().adapter.saveTags(allTags);
    },

    // Get all tags as Tag objects for UI
    getAllTags: (): Tag[] => {
      return Array.from(get().tags)
        .sort() // Sort alphabetically
        .map(tag => ({
          id: tag,
          name: tag,
          color: getTagColor(tag),
        }));
    },

    // Check if tag exists
    hasTag: (tag: string): boolean => {
      const normalizedTag = normalizeTag(tag);
      return get().tags.has(normalizedTag);
    },

    // Hydrate from array
    hydrate: (tags: string[]): void => {
      set({
        tags: new Set(tags.map(normalizeTag)),
        isLoading: false,
        error: null,
      });
    },

    // Refresh from adapter
    refreshFromAdapter: async (): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        const tags = await get().adapter.fetchAllTags();
        get().hydrate(tags);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load tags',
          isLoading: false,
        });
      }
    },
  }));
}
