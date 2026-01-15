"use client";

import { CommandPalette } from "@/components/command-palette";
import { NoteEditor } from "@/components/note-editor";
import { NotesTree } from "@/components/notes-tree";
import { SettingsDialog } from "@/components/settings-dialog";
import { CategorySelectionModal } from "@/components/category-selection-modal";
import type { Note } from "@/lib/types";
import { getTagColor } from "@/lib/tag-utils";
import { useNotesStore, useTagsStore, useCategoriesStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback } from "react";

export function NotesWorkspace() {
  // Toast notifications
  const { toast } = useToast();
  // Store state - use stable selectors
  const notesMap = useNotesStore((state) => state.notes);
  const orderedNoteIds = useNotesStore((state) => state.orderedNoteIds);
  const createNote = useNotesStore((state) => state.createNote);
  const updateNote = useNotesStore((state) => state.updateNote);
  const deleteNote = useNotesStore((state) => state.deleteNote);
  const refreshFromAdapter = useNotesStore((state) => state.refreshFromAdapter);
  const getNote = useNotesStore((state) => state.getNote);
  const getNotesByCategory = useNotesStore((state) => state.getNotesByCategory);
  const getNotesByTag = useNotesStore((state) => state.getNotesByTag);

  // Categories store
  const categoriesMap = useCategoriesStore((state) => state.categories);
  const categories = useMemo(() => Object.values(categoriesMap), [categoriesMap]);
  const createCategory = useCategoriesStore((state) => state.createCategory);
  const deleteCategory = useCategoriesStore((state) => state.deleteCategory);
  const refreshCategories = useCategoriesStore((state) => state.refreshFromAdapter);

  // Tags store
  const addTag = useTagsStore((state) => state.addTag);
  const removeTag = useTagsStore((state) => state.removeTag);
  const refreshTags = useTagsStore((state) => state.refreshFromAdapter);
  const tagsSet = useTagsStore((state) => state.tags);
  const tags = useMemo(
    () =>
      Array.from(tagsSet)
        .sort()
        .map((tag) => ({ id: tag, name: tag, color: getTagColor(tag) })),
    [tagsSet]
  );
  
  // Derive notes array from the map (stable reference via orderedNoteIds)
  const notes = orderedNoteIds.map(id => notesMap[id]).filter((note): note is Note => note !== undefined);

  // Local UI state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isLeftBarCollapsed, setIsLeftBarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsPreSelect, setSettingsPreSelect] = useState<"ai" | "categories" | undefined>(
    undefined
  );
  const [settingsPreFillCategory, setSettingsPreFillCategory] = useState<string | undefined>(
    undefined
  );
  const [pendingCategoryNoteId, setPendingCategoryNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(false);

  // Listen for API errors and show toasts
  useEffect(() => {
    const handleShowToast = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message, type } = customEvent.detail || {};
      
      if (message) {
        toast({
          description: message,
          variant: type === 'error' ? 'destructive' : 'default',
        });
      }
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => {
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, [toast]);

  // Load notes, tags, and categories on mount
  useEffect(() => {
    Promise.all([
      refreshFromAdapter(),
      refreshTags(),
      refreshCategories(),
    ]).then(() => {
      // Select first note if available
      if (orderedNoteIds.length > 0 && !selectedNoteId) {
        setSelectedNoteId(orderedNoteIds[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedNote = useMemo(
    () => (selectedNoteId ? notesMap[selectedNoteId] ?? null : null),
    [selectedNoteId, notesMap]
  );

  const handleUpdateNote = useCallback(
    async (noteId: string, updates: Partial<typeof selectedNote>) => {
      console.log('📝 [handleUpdateNote] Updating note:', noteId, 'with updates:', updates);
      await updateNote(noteId, (note) => ({
        ...note,
        ...updates,
      }));
      
      // If system tags were updated, refresh the tags store
      if (updates?.tags?.system && updates.tags.system.length > 0) {
        console.log('📝 [handleUpdateNote] Refreshing tags store due to system tags update');
        await refreshTags();
      }
    },
    [updateNote, refreshTags]
  );

  const handleCreateNote = async () => {
    // Filter manual categories (noEnrichment = true)
    const manualCategories = categories.filter((cat) => cat.noEnrichment === true);
    const hasAICategories = categories.some((cat) => !cat.noEnrichment);

    // If no manual categories, auto-classify using AI
    if (manualCategories.length === 0) {
      const noteId = await createNote({
        title: "Untitled Note",
        contentBlocks: [],
        category: undefined, // AI Auto Classify
        tags: { user: [], system: [] },
      });
      setSelectedNoteId(noteId);
      return;
    }

    // If only one manual category and no AI categories, create note with that category
    if (manualCategories.length === 1 && !hasAICategories) {
      const noteId = await createNote({
        title: "Untitled Note",
        contentBlocks: [],
        category: manualCategories[0].id,
        tags: { user: [], system: [] },
      });
      setSelectedNoteId(noteId);
      return;
    }

    // Multiple categories or multiple options available, show selection modal
    setShowCategorySelection(true);
  };

  const handleCategorySelected = async (categoryId: string | null) => {
    // Create new note with selected category
    const noteId = await createNote({
      title: "Untitled Note",
      contentBlocks: [],
      category: categoryId || undefined, // null = Auto Classify, undefined = no category
      tags: { user: [], system: [] },
    });
    setSelectedNoteId(noteId);
  };

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      await removeTag(tagId);
      // Remove tag from all notes
      notes.forEach((note) => {
        if (note.tags.user.includes(tagId)) {
          updateNote(note.id, (n) => ({
            ...n,
            tags: {
              ...n.tags,
              user: n.tags.user.filter((id) => id !== tagId),
            },
          }));
        }
      });
    },
    [notes, removeTag, updateNote]
  );

  const handleRemoveCategory = useCallback(
    async (categoryId: string) => {
      await deleteCategory(categoryId);
      // Remove category from all notes
      notes.forEach((note) => {
        if (note.category === categoryId) {
          updateNote(note.id, (n) => ({
            ...n,
            category: undefined,
          }));
        }
      });
    },
    [notes, deleteCategory, updateNote]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await deleteNote(noteId);
      // Select another note if the deleted one was selected
      if (selectedNoteId === noteId) {
        const remainingIds = orderedNoteIds.filter((id) => id !== noteId);
        setSelectedNoteId(remainingIds[0] || null);
      }
    },
    [selectedNoteId, orderedNoteIds, deleteNote]
  );

  const handleOpenSettingsWithCategory = useCallback((categoryName: string) => {
    setSettingsPreSelect("categories");
    setSettingsPreFillCategory(categoryName);
    setPendingCategoryNoteId(selectedNoteId); // Track which note needs this category
    setIsSettingsOpen(true);
  }, [selectedNoteId]);

  const handleCategoryCreated = useCallback(
    async (categoryId: string) => {
      // Add the newly created category to the pending note
      if (pendingCategoryNoteId) {
        const note = getNote(pendingCategoryNoteId);
        if (note && note.category !== categoryId) {
          await updateNote(pendingCategoryNoteId, (n) => ({
            ...n,
            category: categoryId,
          }));
        }
      }
    },
    [pendingCategoryNoteId, getNote, updateNote]
  );

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setSettingsPreSelect(undefined);
    setSettingsPreFillCategory(undefined);
    setPendingCategoryNoteId(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Search in note titles and content blocks
      const results = notes
        .filter((note) => {
          const titleMatch = note.title?.toLowerCase().includes(query.toLowerCase());
          const contentMatch = note.contentBlocks?.some((block) => {
            if (block.type === 'p' || block.type === 'h1' || block.type === 'h2') {
              try {
                const content = JSON.stringify(block.content);
                return content?.toLowerCase().includes(query.toLowerCase());
              } catch {
                return false;
              }
            }
            return false;
          });
          return titleMatch || contentMatch;
        })
        .map((note) => note.id);
      setSearchResults(results);
      setIsSearchActive(true);
    } else {
      setSearchResults([]);
      setIsSearchActive(false);
    }
  }, [notes]);

  const handleSearchByCategory = useCallback((categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (category) {
      const results = getNotesByCategory(categoryId).map((note) => note.id);
      setSearchQuery(`Category: ${category.name}`);
      setSearchResults(results);
      setIsSearchActive(true);
    }
  }, [categories, getNotesByCategory]);

  const handleSearchByTag = useCallback((tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      const results = getNotesByTag(tagId).map((note) => note.id);
      setSearchQuery(`Tag: ${tag.name}`);
      setSearchResults(results);
      setIsSearchActive(true);
    }
  }, [tags, getNotesByTag]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchActive(false);
  }, []);

  // Convert search results from IDs to notes for components - memoized
  const searchResultNotes = useMemo(
    () =>
      searchResults
        .map((id) => notesMap[id])
        .filter((note): note is NonNullable<typeof note> => note !== undefined),
    [searchResults, notesMap]
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {!isLeftBarCollapsed && (
        <NotesTree
          notes={notes}
          categories={categories}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isSearchActive={isSearchActive}
          searchQuery={searchQuery}
          searchResults={searchResultNotes}
          onClearSearch={handleClearSearch}
        />
      )}

      <div className="flex-1 flex flex-col bg-muted pt-3 gap-1.5 min-w-xs min-h-0">
        <CommandPalette
          notes={notes}
          onSelectNote={setSelectedNoteId}
          isLeftBarCollapsed={isLeftBarCollapsed}
          onToggleLeftBar={() => setIsLeftBarCollapsed(!isLeftBarCollapsed)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCreateNote={handleCreateNote}
          onSearch={handleSearch}
        />

        <NoteEditor
          note={selectedNote}
          noteId={selectedNoteId}
          tags={tags}
          categories={categories}
          onUpdateNote={handleUpdateNote}
          onAddTag={async (tagName) => {
            const normalizedTag = await addTag(tagName);
            return normalizedTag;
          }}
          onAddCategory={async (category) => await createCategory(category.name, category.enrichmentPrompt)}
          onRemoveTag={handleRemoveTag}
          onRemoveCategory={handleRemoveCategory}
          onOpenSettingsWithCategory={handleOpenSettingsWithCategory}
          onSearchByCategory={handleSearchByCategory}
          onSearchByTag={handleSearchByTag}
          onDeleteNote={handleDeleteNote}
        />
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        onCategoryCreated={handleCategoryCreated}
        preSelectTab={settingsPreSelect}
        preFillCategoryName={settingsPreFillCategory}
      />

      <CategorySelectionModal
        open={showCategorySelection}
        onOpenChange={setShowCategorySelection}
        categories={categories}
        onSelect={handleCategorySelected}
      />
    </div>
  );
}
