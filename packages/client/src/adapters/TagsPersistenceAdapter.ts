import type { Tag } from '../lib/types';

export interface TagsPersistenceAdapter {
  fetchAllTags(): Promise<Tag[]>;
  createTag(tag: Tag): Promise<void>;
  updateTag(tag: Tag): Promise<void>;
  deleteTag(tagId: string): Promise<void>;
}
