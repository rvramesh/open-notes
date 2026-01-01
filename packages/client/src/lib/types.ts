export interface Note {
  id: string;
  title: string;
  content: string;
  tagIds: string[];
  categoryIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: "rose" | "blue" | "purple" | "green" | "amber";
}

export interface Category {
  id: string;
  name: string;
  color: "rose" | "blue" | "purple" | "green" | "amber";
  aiPrompt: string;
}
