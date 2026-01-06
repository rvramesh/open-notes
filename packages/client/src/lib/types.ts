// Core primitives
export type NoteId = string;
export type BlockId = string;
export type Timestamp = number; // Milliseconds since Unix epoch (UTC), from Date.now()
export type Embedding = number[];

// Re-export Category from settings-types for convenience
export type { Category } from './settings-types';

// Block Model
export interface Block {
  id: BlockId;
  type: string; // 'paragraph', 'heading', 'list', 'code', etc.
  content: unknown; // Block-specific content structure
  createdAt: Timestamp;
}

// Note Domain Model (block-based)
export interface Note {
  // Identity
  id: NoteId;
  title: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Content separation
  contentBlocks: Block[]; // User-authored, immutable by AI
  enrichmentBlocks: Block[]; // AI-generated, replaceable

  // Optional semantic embeddings (note-level)
  embeddings?: Embedding[];

  // Classification
  category?: string; // Reference to Category ID in settings (single category)
  tags: {
    user: string[]; // User-applied tags
    system: string[]; // AI-generated tags
  };
}

export type ColorName = 
  | "rose" | "pink" | "fuchsia" | "purple" | "violet"
  | "indigo" | "blue" | "sky" | "cyan" | "teal"
  | "emerald" | "green" | "lime" | "yellow" | "amber"
  | "orange" | "red" | "warmGray" | "coolGray" | "slate";

export interface Tag {
  id: string;
  name: string;
  color: ColorName;
}

// Category is defined in settings-types.ts - import from there

// Model Configuration for AI
export interface ModelConfiguration {
  provider: string; // e.g., 'openai', 'anthropic', 'ollama'
  modelName: string; // e.g., 'gpt-4', 'claude-3-opus', 'llama2'
  baseUrl?: string; // Optional custom API endpoint
  apiKey?: string; // Optional API key (encrypted or environment-based)
}
