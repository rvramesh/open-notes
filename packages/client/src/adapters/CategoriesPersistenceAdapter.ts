import type { Category } from '../lib/types';

export interface CategoriesPersistenceAdapter {
  fetchAllCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<void>;
  updateCategory(category: Category): Promise<void>;
  deleteCategory(categoryId: string): Promise<void>;
}
