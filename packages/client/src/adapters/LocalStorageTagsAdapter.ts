import type { Tag, ColorName, Note } from '../lib/types';
import type { TagsPersistenceAdapter } from './TagsPersistenceAdapter';

const PASTEL_COLORS: ColorName[] = [
  'rose', 'pink', 'fuchsia', 'purple', 'violet',
  'indigo', 'blue', 'sky', 'cyan', 'teal',
  'emerald', 'green', 'lime', 'yellow', 'amber',
  'orange', 'red', 'warmGray', 'coolGray', 'slate'
];

function getRandomColor(): ColorName {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

export class LocalStorageTagsAdapter implements TagsPersistenceAdapter {
  private readonly storageKey = 'open-notes:tags';
  private readonly notesStorageKey = 'open-notes:notes';

  async fetchAllTags(): Promise<Tag[]> {
    const json = localStorage.getItem(this.storageKey);
    
    if (json) {
      return JSON.parse(json);
    }

    // If no tags exist, check if there are notes with tag references
    const notesJson = localStorage.getItem(this.notesStorageKey);
    if (!notesJson) {
      return []; // No notes, return empty
    }

    const notes: Note[] = JSON.parse(notesJson);
    const tagIds = new Set<string>();

    // Collect all unique tag IDs from notes (both user and system tags)
    notes.forEach(note => {
      note.tags.user.forEach(tagId => tagIds.add(tagId));
      note.tags.system.forEach(tagId => tagIds.add(tagId));
    });

    if (tagIds.size === 0) {
      return []; // No tags in notes
    }

    // Create tag objects for found IDs
    const tags: Tag[] = Array.from(tagIds).map(id => ({
      id,
      name: `Tag ${id}`,
      color: getRandomColor(),
    }));

    // Save the generated tags
    localStorage.setItem(this.storageKey, JSON.stringify(tags));
    return tags;
  }

  async createTag(tag: Tag): Promise<void> {
    const tags = await this.fetchAllTags();
    tags.push(tag);
    localStorage.setItem(this.storageKey, JSON.stringify(tags));
  }

  async updateTag(tag: Tag): Promise<void> {
    const tags = await this.fetchAllTags();
    const index = tags.findIndex(t => t.id === tag.id);
    if (index >= 0) {
      tags[index] = tag;
      localStorage.setItem(this.storageKey, JSON.stringify(tags));
    }
  }

  async deleteTag(tagId: string): Promise<void> {
    const tags = await this.fetchAllTags();
    const filtered = tags.filter(t => t.id !== tagId);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }
}
