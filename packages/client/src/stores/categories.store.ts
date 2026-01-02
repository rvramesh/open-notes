import { create } from 'zustand';
import type { Category, ColorName } from '../lib/types';
import type { CategoriesPersistenceAdapter } from '../adapters/CategoriesPersistenceAdapter';

const PASTEL_COLORS: ColorName[] = [
  'rose', 'pink', 'fuchsia', 'purple', 'violet',
  'indigo', 'blue', 'sky', 'cyan', 'teal',
  'emerald', 'green', 'lime', 'yellow', 'amber',
  'orange', 'red', 'warmGray', 'coolGray', 'slate'
];

function getRandomColor(): ColorName {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

interface CategoriesStoreState {
  categories: Record<string, Category>;
  adapter: CategoriesPersistenceAdapter;
  isLoading: boolean;
  error: string | null;
}

interface CategoriesStoreActions {
  createCategory(name: string, aiPrompt?: string): Promise<string>;
  updateCategory(id: string, updates: Partial<Category>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Category | undefined;
  getAllCategories(): Category[];
  getCategoryByName(name: string): Category | undefined;
  hydrate(categories: Category[]): void;
  refreshFromAdapter(): Promise<void>;
}

type CategoriesStore = CategoriesStoreState & CategoriesStoreActions;

export function createCategoriesStore(adapter: CategoriesPersistenceAdapter) {
  return create<CategoriesStore>((set, get) => ({
    // State
    categories: {},
    adapter,
    isLoading: false,
    error: null,

    // Create category
    createCategory: async (name: string, aiPrompt?: string): Promise<string> => {
      const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const category: Category = {
        id,
        name,
        color: getRandomColor(),
        aiPrompt: aiPrompt || 'Provide insights and context relevant to this category.',
      };

      // Update local state
      set(state => ({
        categories: { ...state.categories, [id]: category },
      }));

      // Persist
      await get().adapter.createCategory(category);

      return id;
    },

    // Update category
    updateCategory: async (id: string, updates: Partial<Category>): Promise<void> => {
      const currentCategory = get().categories[id];
      if (!currentCategory) {
        throw new Error(`Category ${id} not found`);
      }

      const updatedCategory: Category = {
        ...currentCategory,
        ...updates,
      };

      // Update local state
      set(state => ({
        categories: { ...state.categories, [id]: updatedCategory },
      }));

      // Persist
      await get().adapter.updateCategory(updatedCategory);
    },

    // Delete category
    deleteCategory: async (id: string): Promise<void> => {
      // Remove from local state
      set(state => {
        const { [id]: deleted, ...remainingCategories } = state.categories;
        return { categories: remainingCategories };
      });

      // Persist deletion
      await get().adapter.deleteCategory(id);
    },

    // Get category by ID
    getCategory: (id: string): Category | undefined => {
      return get().categories[id];
    },

    // Get all categories as array
    getAllCategories: (): Category[] => {
      return Object.values(get().categories);
    },

    // Get category by name
    getCategoryByName: (name: string): Category | undefined => {
      return Object.values(get().categories).find(c => c.name === name);
    },

    // Hydrate store with categories
    hydrate: (categories: Category[]): void => {
      const categoriesMap: Record<string, Category> = {};
      categories.forEach(category => {
        categoriesMap[category.id] = category;
      });

      set({
        categories: categoriesMap,
        isLoading: false,
        error: null,
      });
    },

    // Refresh from adapter
    refreshFromAdapter: async (): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        const categories = await get().adapter.fetchAllCategories();
        get().hydrate(categories);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load categories',
          isLoading: false,
        });
      }
    },
  }));
}
