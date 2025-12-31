"use client"

import { useState } from "react"
import { NotesTree } from "@/components/notes-tree"
import { NoteEditor } from "@/components/note-editor"
import { CommandPalette } from "@/components/command-palette"
import { SettingsDialog } from "@/components/settings-dialog"
import type { Note, Tag, Category } from "@/lib/types"

// Mock data
const mockCategories: Category[] = [
  { id: "1", name: "Personal", color: "rose", aiPrompt: "Enhance this personal note with insights." },
  { id: "2", name: "Work", color: "blue", aiPrompt: "Summarize work-related tasks." },
  { id: "3", name: "Ideas", color: "purple", aiPrompt: "Expand on creative ideas." },
  { id: "4", name: "Research", color: "green", aiPrompt: "Provide research context and connections." },
]

const mockTags: Tag[] = [
  { id: "1", name: "Urgent", color: "rose" },
  { id: "2", name: "Planning", color: "blue" },
  { id: "3", name: "Creative", color: "purple" },
  { id: "4", name: "Technical", color: "green" },
]

const mockNotes: Note[] = [
  {
    id: "1",
    title: "Meeting Notes - Q1 Planning",
    content: "Discussed quarterly goals and team objectives. Need to follow up on budget allocation.",
    categoryIds: ["2"],
    tagIds: ["1", "2"],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "Book Ideas",
    content: "Collection of interesting book concepts and plot ideas for future writing projects.",
    categoryIds: ["1"],
    tagIds: ["3"],
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-16"),
  },
]

export function NotesWorkspace() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(mockNotes[0]?.id || null)
  const [notes, setNotes] = useState<Note[]>(mockNotes)
  const [tags, setTags] = useState<Tag[]>(mockTags)
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [isLeftBarCollapsed, setIsLeftBarCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsPreSelect, setSettingsPreSelect] = useState<"ai" | "categories" | undefined>(undefined)
  const [settingsPreFillCategory, setSettingsPreFillCategory] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Note[]>([])
  const [isSearchActive, setIsSearchActive] = useState(false)

  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
  }

  const handleCreateNote = () => {
    // Save current note first
    if (selectedNote) {
      handleUpdateNote(selectedNote)
    }

    // Create new note
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      categoryIds: [],
      tagIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setNotes((prev) => [newNote, ...prev])
    setSelectedNoteId(newNote.id)
  }

  const handleRemoveTag = (tagId: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== tagId))
    // Remove tag from all notes
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        tagIds: note.tagIds.filter((id) => id !== tagId),
      })),
    )
  }

  const handleRemoveCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
    // Remove category from all notes
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        categoryIds: note.categoryIds.filter((id) => id !== categoryId),
      })),
    )
  }

  const handleOpenSettingsWithCategory = (categoryName: string) => {
    setSettingsPreSelect("categories")
    setSettingsPreFillCategory(categoryName)
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
    setSettingsPreSelect(undefined)
    setSettingsPreFillCategory(undefined)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(query.toLowerCase()) ||
          note.content.toLowerCase().includes(query.toLowerCase()),
      )
      setSearchResults(results)
      setIsSearchActive(true)
    } else {
      setSearchResults([])
      setIsSearchActive(false)
    }
  }

  const handleSearchByCategory = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (category) {
      const results = notes.filter((note) => note.categoryIds.includes(categoryId))
      setSearchQuery(`Category: ${category.name}`)
      setSearchResults(results)
      setIsSearchActive(true)
    }
  }

  const handleSearchByTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId)
    if (tag) {
      const results = notes.filter((note) => note.tagIds.includes(tagId))
      setSearchQuery(`Tag: ${tag.name}`)
      setSearchResults(results)
      setIsSearchActive(true)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setIsSearchActive(false)
  }

  return (
    <div className="flex h-screen bg-background">
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
          searchResults={searchResults}
          onClearSearch={handleClearSearch}
        />
      )}

      <div className="flex-1 flex flex-col bg-muted/30 pt-3 gap-1.5">
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
  )
}
