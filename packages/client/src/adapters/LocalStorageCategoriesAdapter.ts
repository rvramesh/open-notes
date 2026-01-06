import type { Category, ColorName, Note } from '../lib/types';
import type { CategoriesPersistenceAdapter } from './CategoriesPersistenceAdapter';

const PASTEL_COLORS: ColorName[] = [
  'rose', 'pink', 'fuchsia', 'purple', 'violet',
  'indigo', 'blue', 'sky', 'cyan', 'teal',
  'emerald', 'green', 'lime', 'yellow', 'amber',
  'orange', 'red', 'warmGray', 'coolGray', 'slate'
];

function getRandomColor(): ColorName {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

export class LocalStorageCategoriesAdapter implements CategoriesPersistenceAdapter {
  private readonly storageKey = 'open-notes:categories';
  private readonly notesStorageKey = 'open-notes:notes';

  async fetchAllCategories(): Promise<Category[]> {
    const json = localStorage.getItem(this.storageKey);
    
    if (json) {
      return JSON.parse(json);
    }

    // If no categories exist, check if there are notes with category references
    const notesJson = localStorage.getItem(this.notesStorageKey);
    if (!notesJson) {
      return []; // No notes, return empty
    }

    const notes: Note[] = JSON.parse(notesJson);
    const categoryIds = new Set<string>();

    // Collect all unique category IDs from notes
    notes.forEach((note) => {
      if (note.category) {
        categoryIds.add(note.category);
      }
    });

    if (categoryIds.size === 0) {
      return []; // No categories in notes
    }

    // Create category objects for found IDs
    const categories: Category[] = Array.from(categoryIds).map(id => ({
      id,
      name: `Category ${id}`,
      color: getRandomColor(),
      enrichmentPrompt: 'Provide insights and context relevant to this category.',
      noEnrichment: false,
    }));

    // Save the generated categories
    localStorage.setItem(this.storageKey, JSON.stringify(categories));
    return categories;
  }

  async createCategory(category: Category): Promise<void> {
    const categories = await this.fetchAllCategories();
    categories.push(category);
    localStorage.setItem(this.storageKey, JSON.stringify(categories));
  }

  async updateCategory(category: Category): Promise<void> {
    const categories = await this.fetchAllCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
      localStorage.setItem(this.storageKey, JSON.stringify(categories));
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const categories = await this.fetchAllCategories();
    const filtered = categories.filter(c => c.id !== categoryId);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }
}
