/**
 * Adapter interface for tag persistence
 * Tags are stored as a simple array of normalized strings
 */
export interface TagsPersistenceAdapter {
  fetchAllTags(): Promise<string[]>;
  saveTags(tags: string[]): Promise<void>;
}
