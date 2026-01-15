/**
 * Note Processing Utilities
 * 
 * Handles automatic categorization and enrichment of notes via AI.
 * These operations are triggered after a note is saved and remains unchanged
 * for a configured processing delay.
 */

import type { Note, Block } from './types';
import type { Category } from './settings-types';
import { getApiBaseUrl, ensureInitialized } from '../api';

/**
 * AI categorization response
 */
interface CategorizationResponse {
  category: string[]; // Array of category IDs, best match first
  tags: string[]; // Extracted and inferred tags in kebab-case
}

/**
 * AI enrichment response
 */
interface EnrichmentResponse {
  enrichmentBlocks: Block[];
}



/**
 * Categorize a note using AI
 * Calls the server's categorization endpoint with the note content
 * 
 * @param note - The note to categorize
 * @param contentMarkdown - The note content as markdown (pre-serialized)
 * @param categories - Available categories
 * @param categoryPrompt - The categorization system prompt template
 * @returns Categorization result with category IDs and tags
 */
export async function categorizeNote(
  note: Note,
  contentMarkdown: string,
  categories: Category[]
): Promise<CategorizationResponse> {
  await ensureInitialized();
  const apiUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${apiUrl}/categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteId: note.id,
        title: note.title,
        content: contentMarkdown,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Categorization failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result: CategorizationResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to categorize note:', error);
    throw error;
  }
}

/**
 * Enrich a note using AI
 * Calls the server's enrichment endpoint to generate enrichment blocks
 * 
 * @param note - The note to enrich
 * @param contentMarkdown - The note content as markdown (pre-serialized)
 * @param category - The category for context-specific enrichment
 * @param genericPrompt - Fallback prompt if no category-specific prompt exists
 * @returns Enrichment result with enrichment blocks
 */
export async function enrichNote(
  note: Note,
  contentMarkdown: string,
  category: Category | undefined,
  genericPrompt: string
): Promise<EnrichmentResponse> {
  await ensureInitialized();
  const apiUrl = getApiBaseUrl();

  try {
    // Don't enrich if category has noEnrichment flag
    if (category?.noEnrichment) {
      return { enrichmentBlocks: [] };
    }

    const enrichmentPrompt = category?.enrichmentPrompt || genericPrompt;

    const response = await fetch(`${apiUrl}/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        noteId: note.id,
        title: note.title,
        content: contentMarkdown,
        categoryId: category?.id,
        enrichmentPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Enrichment failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result: EnrichmentResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to enrich note:', error);
    throw error;
  }
}

/**
 * Process a note: categorize and enrich if needed
 * This is the main entry point for automatic note processing
 * 
 * Conditions for processing:
 * - Note must be saved
 * - Note must remain unchanged for processingDelay seconds
 * - AI models must be configured
 * 
 * @param note - The note to process
 * @param contentMarkdown - The note content as markdown (pre-serialized from editor)
 * @param options - Processing options
 * @returns Updated note properties (category, tags, enrichmentBlocks)
 */
export async function processNote(
  note: Note,
  contentMarkdown: string,
  options: {
    categories: Category[];
    categoryPrompt: string;
    genericEnrichmentPrompt: string;
  }
): Promise<{
  category?: string;
  tags?: { user: string[]; system: string[] };
  enrichmentBlocks?: Block[];
}> {
  const updates: {
    category?: string;
    tags?: { user: string[]; system: string[] };
    enrichmentBlocks?: Block[];
  } = {};

  try {
    // Step 1: Categorization (always run to update tags)
    let categorizationResult: CategorizationResponse | null = null;
    try {
      categorizationResult = await categorizeNote(
        note,
        contentMarkdown,
        options.categories
      );

      console.log('📝 [processNote] Categorization result:', categorizationResult);

      // Update tags from latest response (always)
      if (categorizationResult.tags.length > 0) {
        updates.tags = {
          user: note.tags.user,
          system: categorizationResult.tags,
        };
        console.log('📝 [processNote] Updated tags:', updates.tags);
      }

      // Only assign category if note doesn't have a valid one
      const hasValidCategory = note.category && note.category.length > 0 && options.categories.find(cat => cat.id === note.category);
      if (!hasValidCategory && categorizationResult.category.length > 0) {
        updates.category = categorizationResult.category[0];
        console.log('📝 [processNote] Updated category:', updates.category);
      }
    } catch (error) {
      console.error('Categorization failed during processNote:', error);
      // Re-throw categorization errors so they propagate to UI
      throw error;
    }

    // Step 2: Enrichment
    try {
      const assignedCategoryId = updates.category || note.category;
      const assignedCategory = options.categories.find(
        (cat) => cat.id === assignedCategoryId
      );

      // If category was auto-assigned and is marked noEnrichment, skip enrichment
      const autoAssignedCategoryId = !note.category ? updates.category : undefined;
      const autoAssignedCategory = options.categories.find(
        (cat) => cat.id === autoAssignedCategoryId
      );
      const shouldSkipEnrichment = !!autoAssignedCategory?.noEnrichment;

      if (!shouldSkipEnrichment) {
        const enrichmentResult = await enrichNote(
          note,
          contentMarkdown,
          assignedCategory,
          options.genericEnrichmentPrompt
        );
        updates.enrichmentBlocks = enrichmentResult.enrichmentBlocks;
      }
    } catch (error) {
      console.error('Enrichment failed during processNote:', error);
    }

    return updates;
  } catch (error) {
    console.error('Failed to process note:', error);
    throw error;
  }
}
