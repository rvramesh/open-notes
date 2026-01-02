"use client";

import { CommandPalette } from "@/components/command-palette";
import { NoteEditor } from "@/components/note-editor";
import { NotesTree } from "@/components/notes-tree";
import { SettingsDialog } from "@/components/settings-dialog";
import type { Category, Tag, Note } from "@/lib/types";
import { useNotesStore } from "@/lib/store";
import { useState, useEffect } from "react";

// Mock data
const mockCategories: Category[] = [
  {
    id: "1",
    name: "Personal",
    color: "rose",
    aiPrompt: "Enhance this personal note with insights.",
  },
  { id: "2", name: "Work", color: "blue", aiPrompt: "Summarize work-related tasks." },
  { id: "3", name: "Ideas", color: "purple", aiPrompt: "Expand on creative ideas." },
  {
    id: "4",
    name: "Research",
    color: "green",
    aiPrompt: "Provide research context and connections.",
  },
];

const mockTags: Tag[] = [
  { id: "1", name: "Urgent", color: "rose" },
  { id: "2", name: "Planning", color: "blue" },
  { id: "3", name: "Creative", color: "purple" },
  { id: "4", name: "Technical", color: "green" },
];

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
  
  // Derive notes array from the map (stable reference via orderedNoteIds)
  const notes = orderedNoteIds.map(id => notesMap[id]).filter((note): note is Note => note !== undefined);

  // Local UI state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>(mockTags);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [isLeftBarCollapsed, setIsLeftBarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsPreSelect, setSettingsPreSelect] = useState<"ai" | "categories" | undefined>(
    undefined
  );
  const [settingsPreFillCategory, setSettingsPreFillCategory] = useState<string | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Load notes on mount
  useEffect(() => {
    refreshFromAdapter().then(() => {
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

  const handleRemoveTag = (tagId: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
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

  const handleRemoveCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
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
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setSettingsPreSelect(undefined);
    setSettingsPreFillCategory(undefined);
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
          onAddTag={(tag) => setTags([...tags, tag])}
          onAddCategory={(category) => setCategories([...categories, category])}
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
        onUpdateCategories={setCategories}
        preSelectTab={settingsPreSelect}
        preFillCategoryName={settingsPreFillCategory}
      />
    </div>
  );
}
