import type { TagsPersistenceAdapter } from './TagsPersistenceAdapter';
import { normalizeTag } from '../lib/tag-utils';

export class LocalStorageTagsAdapter implements TagsPersistenceAdapter {
  private readonly storageKey = 'open-notes:tags';
  private readonly notesStorageKey = 'open-notes:notes';

  async fetchAllTags(): Promise<string[]> {
    const json = localStorage.getItem(this.storageKey);
    
    if (json) {
      const tags: string[] = JSON.parse(json);
      // Ensure all tags are normalized
      return tags.map(normalizeTag);
    }

    // If no tags exist, check if there are notes with tag references
    const notesJson = localStorage.getItem(this.notesStorageKey);
    if (!notesJson) {
      return []; // No notes, return empty
    }

    const notes = JSON.parse(notesJson);
    const allTags = new Set<string>();

    // Collect all unique tag strings from notes (both user and system tags)
    Object.values(notes).forEach((note: any) => {
      if (note.tags) {
        if (Array.isArray(note.tags.user)) {
          note.tags.user.forEach((tag: string) => allTags.add(normalizeTag(tag)));
        }
        if (Array.isArray(note.tags.system)) {
          note.tags.system.forEach((tag: string) => allTags.add(normalizeTag(tag)));
        }
      }
    });

    const tagsArray = Array.from(allTags);

    // Save the generated tags
    if (tagsArray.length > 0) {
      localStorage.setItem(this.storageKey, JSON.stringify(tagsArray));
    }
    
    return tagsArray;
  }

  async saveTags(tags: string[]): Promise<void> {
    // Ensure all tags are normalized before saving
    const normalizedTags = tags.map(normalizeTag);
    localStorage.setItem(this.storageKey, JSON.stringify(normalizedTags));
  }
}
