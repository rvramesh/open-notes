/**
 * Settings Store
 * 
 * Manages user configuration and AI prompts.
 * Stores are persisted via adapter-based persistence strategy.
 * 
 * Responsibilities:
 * - Store application preferences (theme, font size, etc.)
 * - Manage category definitions with enrichment prompts
 * - Configure AI models
 * - Persist settings to storage
 */

import { create } from 'zustand';
import type {
  SettingsStoreState,
  SettingsStoreActions,
  SettingsPersistenceAdapter,
  Category,
  ThemePreference,
  FontSize,
  ModelConfiguration,
  EditorSettings,
} from '../lib/settings-types';

/**
 * Combined store type
 */
export type SettingsStore = SettingsStoreState & SettingsStoreActions;

/**
 * Default settings values
 */
const defaultSettings: Omit<
  SettingsStoreState,
  'adapter' | 'isLoading' | 'error' | 'lastSavedAt'
> = {
  // Appearance
  theme: 'system',
  fontSize: 'md',

  // AI configuration
  languageModel: undefined,
  embeddingModel: undefined,

  // Categories
  categories: [
    {
      id: 'default-general',
      name: 'General',
      color: 'blue',
      enrichmentPrompt:
        'Create a brief summary and key points from this note.',
    },
    {
      id: 'default-research',
      name: 'Research',
      color: 'purple',
      enrichmentPrompt:
        'Extract entities, citations, and research questions from this note.',
    },
    {
      id: 'default-personal',
      name: 'Personal',
      color: 'rose',
      enrichmentPrompt:
        'Identify themes and emotional undertones in this personal note.',
    },
  ],

  // AI prompts
  genericEnrichmentPrompt: '',

  categoryRecognitionPrompt: `You are a note categorizer. Given a note's title and content, classify it into one of these available categories:
{% for category in categories -%}
- {{ category.name }}
{% endfor %}
Respond with just the category name. If none match, respond with "General".`,

  // Editor preferences
  editorSettings: {
    autoSave: true,
    autoSaveInterval: 10, // 10 seconds
  },
};

/**
 * Create the settings store with the provided adapter.
 * 
 * @param adapter - The persistence adapter to use
 * @returns Zustand store hook
 */
export const createSettingsStore = (adapter: SettingsPersistenceAdapter) => {
  return create<SettingsStore>((set, get) => ({
    // Initial state
    ...defaultSettings,
    adapter,
    isLoading: false,
    error: null,

    // Appearance actions
    setTheme: async (theme: ThemePreference): Promise<void> => {
      set({ theme });
      await get().save();
    },

    setFontSize: async (fontSize: FontSize): Promise<void> => {
      set({ fontSize });
      await get().save();
    },

    // AI configuration actions
    setLanguageModel: async (model: ModelConfiguration): Promise<void> => {
      set({ languageModel: model });
      await get().save();
    },

    setEmbeddingModel: async (model: ModelConfiguration): Promise<void> => {
      set({ embeddingModel: model });
      await get().save();
    },

    clearLanguageModel: async (): Promise<void> => {
      set({ languageModel: undefined });
      await get().save();
    },

    clearEmbeddingModel: async (): Promise<void> => {
      set({ embeddingModel: undefined });
      await get().save();
    },

    // Category management
    createCategory: async (
      name: string,
      color: Category['color'],
      prompt: string
    ): Promise<string> => {
      const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const category: Category = { id, name, color, enrichmentPrompt: prompt };

      set(state => ({
        categories: [...state.categories, category],
      }));

      await get().save();
      return id;
    },

    updateCategory: async (id: string, updates: Partial<Category>): Promise<void> => {
      set(state => ({
        categories: state.categories.map(cat =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      }));

      await get().save();
    },

    deleteCategory: async (id: string): Promise<void> => {
      set(state => ({
        categories: state.categories.filter(cat => cat.id !== id),
      }));

      await get().save();
    },

    getCategory: (id: string): Category | undefined => {
      return get().categories.find(cat => cat.id === id);
    },

    getCategoryByName: (name: string): Category | undefined => {
      return get().categories.find(cat => cat.name === name);
    },

    // Prompt management
    setGenericEnrichmentPrompt: async (prompt: string): Promise<void> => {
      set({ genericEnrichmentPrompt: prompt });
      await get().save();
    },

    setCategoryRecognitionPrompt: async (prompt: string): Promise<void> => {
      set({ categoryRecognitionPrompt: prompt });
      await get().save();
    },

    // Editor settings
    setEditorSetting: async (
      key: keyof EditorSettings,
      value: boolean | number
    ): Promise<void> => {
      set(state => ({
        editorSettings: {
          ...state.editorSettings,
          [key]: value,
        },
      }));

      await get().save();
    },

    // Lifecycle actions
    load: async (): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        const adapter = get().adapter;
        if (!adapter) {
          throw new Error('No persistence adapter configured');
        }

        const loaded = await adapter.load();
        if (loaded) {
          // Merge loaded settings with defaults to ensure all fields exist
          set({
            ...defaultSettings,
            ...loaded,
            adapter, // Preserve adapter reference
            isLoading: false,
            error: null,
          });
        } else {
          // No saved settings; use defaults
          set({ isLoading: false, error: null });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    save: async (): Promise<void> => {
      try {
        const adapter = get().adapter;
        if (!adapter) {
          throw new Error('No persistence adapter configured');
        }

        const state = get();
        await adapter.save({
          theme: state.theme,
          fontSize: state.fontSize,
          languageModel: state.languageModel,
          embeddingModel: state.embeddingModel,
          categories: state.categories,
          genericEnrichmentPrompt: state.genericEnrichmentPrompt,
          categoryRecognitionPrompt: state.categoryRecognitionPrompt,
          editorSettings: state.editorSettings,
          adapter: undefined,
          isLoading: false,
          error: null,
          lastSavedAt: Date.now(),
        });

        set({ lastSavedAt: Date.now(), error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ error: message });
        throw error;
      }
    },

    resetToDefaults: (): void => {
      set({
        ...defaultSettings,
        lastSavedAt: Date.now(),
      });
    },
  }));
};

/**
 * Predefined categories for quick setup
 */
export const PREDEFINED_CATEGORIES: readonly Category[] = [
  {
    id: 'default-general',
    name: 'General',
    color: 'blue',
    enrichmentPrompt:
      'Create a brief summary and key points from this note.',
  },
  {
    id: 'default-research',
    name: 'Research',
    color: 'purple',
    enrichmentPrompt:
      'Extract entities, citations, and research questions from this note.',
  },
  {
    id: 'default-personal',
    name: 'Personal',
    color: 'rose',
    enrichmentPrompt:
      'Identify themes and emotional undertones in this personal note.',
  },
];
