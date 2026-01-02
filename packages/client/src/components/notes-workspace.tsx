"use client";

import { CommandPalette } from "@/components/command-palette";
import { NoteEditor } from "@/components/note-editor";
import { NotesTree } from "@/components/notes-tree";
import { SettingsDialog } from "@/components/settings-dialog";
import type { Category, Tag, Note } from "@/lib/types";
import { useNotesStore, useCategoriesStore, useTagsStore } from "@/lib/store";
import { useState, useEffect } from "react";

export function NotesWorkspace() {
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
  const createCategory = useCategoriesStore((state) => state.createCategory);
  const updateCategory = useCategoriesStore((state) => state.updateCategory);
  const deleteCategory = useCategoriesStore((state) => state.deleteCategory);
  const refreshCategories = useCategoriesStore((state) => state.refreshFromAdapter);
  const categories = Object.values(categoriesMap);

  // Tags store
  const tagsMap = useTagsStore((state) => state.tags);
  const createTag = useTagsStore((state) => state.createTag);
  const updateTag = useTagsStore((state) => state.updateTag);
  const deleteTag = useTagsStore((state) => state.deleteTag);
  const refreshTags = useTagsStore((state) => state.refreshFromAdapter);
  const tags = Object.values(tagsMap);
  
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

  // Load notes, categories, and tags on mount
  useEffect(() => {
    Promise.all([
      refreshFromAdapter(),
      refreshCategories(),
      refreshTags(),
    ]).then(() => {
      // Select first note if available
      if (orderedNoteIds.length > 0 && !selectedNoteId) {
        setSelectedNoteId(orderedNoteIds[0]);
      }
    });
  }, []);

  const selectedNote = selectedNoteId ? getNote(selectedNoteId) ?? null : null;

  const handleUpdateNote = async (noteId: string, updates: Partial<typeof selectedNote>) => {
    await updateNote(noteId, (note) => ({
      ...note,
      ...updates,
    }));
  };

  const handleCreateNote = async () => {
    // Create new note with empty content blocks
    const noteId = await createNote({
      title: "Untitled Note",
      contentBlocks: [],
      categories: [],
      tags: { user: [], system: [] },
    });
    setSelectedNoteId(noteId);
  };

  const handleRemoveTag = async (tagId: string) => {
    await deleteTag(tagId);
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
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await deleteCategory(categoryId);
    // Remove category from all notes
    notes.forEach((note) => {
      if (note.categories.includes(categoryId)) {
        updateNote(note.id, (n) => ({
          ...n,
          categories: n.categories.filter((id) => id !== categoryId),
        }));
      }
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    // Select another note if the deleted one was selected
    if (selectedNoteId === noteId) {
      const remainingIds = orderedNoteIds.filter((id) => id !== noteId);
      setSelectedNoteId(remainingIds[0] || null);
    }
  };

  const handleOpenSettingsWithCategory = (categoryName: string) => {
    setSettingsPreSelect("categories");
    setSettingsPreFillCategory(categoryName);
    setPendingCategoryNoteId(selectedNoteId); // Track which note needs this category
    setIsSettingsOpen(true);
  };

  const handleCategoryCreated = async (categoryId: string) => {
    // Add the newly created category to the pending note
    if (pendingCategoryNoteId) {
      const note = getNote(pendingCategoryNoteId);
      if (note && !note.categories.includes(categoryId)) {
        await updateNote(pendingCategoryNoteId, (n) => ({
          ...n,
          categories: [...n.categories, categoryId],
        }));
      }
    }
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setSettingsPreSelect(undefined);
    setSettingsPreFillCategory(undefined);
    setPendingCategoryNoteId(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Search in note titles and content blocks
      const results = notes
        .filter((note) => {
          const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
          const contentMatch = note.contentBlocks.some((block) => {
            if (block.type === 'p' || block.type === 'h1' || block.type === 'h2') {
              return JSON.stringify(block.content).toLowerCase().includes(query.toLowerCase());
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
  };

  const handleSearchByCategory = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (category) {
      const results = getNotesByCategory(categoryId).map((note) => note.id);
      setSearchQuery(`Category: ${category.name}`);
      setSearchResults(results);
      setIsSearchActive(true);
    }
  };

  const handleSearchByTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      const results = getNotesByTag(tagId).map((note) => note.id);
      setSearchQuery(`Tag: ${tag.name}`);
      setSearchResults(results);
      setIsSearchActive(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchActive(false);
  };

  // Convert search results from IDs to notes for components
  const searchResultNotes = searchResults.map((id) => getNote(id)).filter((note): note is NonNullable<typeof note> => note !== undefined);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {!isLeftBarCollapsed && (
        <NotesTree
          notes={notes}
          tags={tags}
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
          onAddTag={async (tag) => await createTag(tag.name)}
          onAddCategory={async (category) => await createCategory(category.name, category.aiPrompt)}
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
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
        preSelectTab={settingsPreSelect}
        preFillCategoryName={settingsPreFillCategory}
      />
    </div>
  );
}
