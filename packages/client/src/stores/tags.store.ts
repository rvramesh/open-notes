import { create } from 'zustand';
import type { Tag, ColorName } from '../lib/types';
import type { TagsPersistenceAdapter } from '../adapters/TagsPersistenceAdapter';

const PASTEL_COLORS: ColorName[] = [
  'rose', 'pink', 'fuchsia', 'purple', 'violet',
  'indigo', 'blue', 'sky', 'cyan', 'teal',
  'emerald', 'green', 'lime', 'yellow', 'amber',
  'orange', 'red', 'warmGray', 'coolGray', 'slate'
];

function getRandomColor(): ColorName {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

interface TagsStoreState {
  tags: Record<string, Tag>;
  adapter: TagsPersistenceAdapter;
  isLoading: boolean;
  error: string | null;
}

interface TagsStoreActions {
  createTag(name: string): Promise<string>;
  updateTag(id: string, updates: Partial<Tag>): Promise<void>;
  deleteTag(id: string): Promise<void>;
  getTag(id: string): Tag | undefined;
  getAllTags(): Tag[];
  getTagByName(name: string): Tag | undefined;
  hydrate(tags: Tag[]): void;
  refreshFromAdapter(): Promise<void>;
}

type TagsStore = TagsStoreState & TagsStoreActions;

export function createTagsStore(adapter: TagsPersistenceAdapter) {
  return create<TagsStore>((set, get) => ({
    // State
    tags: {},
    adapter,
    isLoading: false,
    error: null,

    // Create tag
    createTag: async (name: string): Promise<string> => {
      const id = `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tag: Tag = {
        id,
        name,
        color: getRandomColor(),
      };

      // Update local state
      set(state => ({
        tags: { ...state.tags, [id]: tag },
      }));

      // Persist
      await get().adapter.createTag(tag);

      return id;
    },

    // Update tag
    updateTag: async (id: string, updates: Partial<Tag>): Promise<void> => {
      const currentTag = get().tags[id];
      if (!currentTag) {
        throw new Error(`Tag ${id} not found`);
      }

      const updatedTag: Tag = {
        ...currentTag,
        ...updates,
      };

      // Update local state
      set(state => ({
        tags: { ...state.tags, [id]: updatedTag },
      }));

      // Persist
      await get().adapter.updateTag(updatedTag);
    },

    // Delete tag
    deleteTag: async (id: string): Promise<void> => {
      // Remove from local state
      set(state => {
        const { [id]: deleted, ...remainingTags } = state.tags;
        return { tags: remainingTags };
      });

      // Persist deletion
      await get().adapter.deleteTag(id);
    },

    // Get tag by ID
    getTag: (id: string): Tag | undefined => {
      return get().tags[id];
    },

    // Get all tags as array
    getAllTags: (): Tag[] => {
      return Object.values(get().tags);
    },

    // Get tag by name
    getTagByName: (name: string): Tag | undefined => {
      return Object.values(get().tags).find(t => t.name === name);
    },

    // Hydrate store with tags
    hydrate: (tags: Tag[]): void => {
      const tagsMap: Record<string, Tag> = {};
      tags.forEach(tag => {
        tagsMap[tag.id] = tag;
      });

      set({
        tags: tagsMap,
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
