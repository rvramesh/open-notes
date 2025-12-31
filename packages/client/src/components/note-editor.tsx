"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Loader2, Check, Plus, X, Sparkles, FileText } from "lucide-react"
import type { Note, Tag, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/utils"
import { LexicalEditor } from "@/components/lexical-editor"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface NoteEditorProps {
  note: Note | null
  tags: Tag[]
  categories: Category[]
  onUpdateNote: (note: Note) => void
  onAddTag: (tag: Tag) => void
  onAddCategory: (category: Category) => void
  onRemoveTag: (tagId: string) => void
  onRemoveCategory: (categoryId: string) => void
  onOpenSettingsWithCategory?: (categoryName: string) => void
  onSearchByCategory?: (categoryId: string) => void
  onSearchByTag?: (tagId: string) => void
}

const tagColorClasses = {
  rose: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/30 dark:text-rose-300",
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/30 dark:text-purple-300",
  green: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-300",
  amber: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
}

export function NoteEditor({
  note,
  tags,
  categories,
  onUpdateNote,
  onAddTag,
  onAddCategory,
  onRemoveTag,
  onRemoveCategory,
  onOpenSettingsWithCategory,
  onSearchByCategory,
  onSearchByTag,
}: NoteEditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [showEnriched, setShowEnriched] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [tagFilter, setTagFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")

  const [hasChanges, setHasChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setHasChanges(false)
      setIsSaved(true)
      setIsTyping(false)
    }
  }, [note])

  useEffect(() => {
    if (!note) return
    if (!hasChanges) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setIsTyping(true)
    setIsSaving(false)
    setIsSaved(false)

    saveTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      setIsSaving(true)

      onUpdateNote({
        ...note,
        title,
        content,
        updatedAt: new Date(),
      })

      setIsSaving(false)
      setIsSaved(true)
      setHasChanges(false)

      setTimeout(() => setIsSaved(false), 2000)
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, content, note, onUpdateNote, hasChanges])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setHasChanges(true)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasChanges(true)
  }

  const handleToggleTag = (tagId: string) => {
    if (!note) return
    const newTagIds = note.tagIds.includes(tagId) ? note.tagIds.filter((id) => id !== tagId) : [...note.tagIds, tagId]
    onUpdateNote({ ...note, tagIds: newTagIds, updatedAt: new Date() })
  }

  const handleToggleCategory = (categoryId: string) => {
    if (!note) return
    const newCategoryIds = note.categoryIds.includes(categoryId)
      ? note.categoryIds.filter((id) => id !== categoryId)
      : [...note.categoryIds, categoryId]
    onUpdateNote({ ...note, categoryIds: newCategoryIds, updatedAt: new Date() })
  }

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!note) return
    onUpdateNote({ ...note, tagIds: note.tagIds.filter((id) => id !== tagId), updatedAt: new Date() })
  }

  const handleRemoveCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!note) return
    onUpdateNote({ ...note, categoryIds: note.categoryIds.filter((id) => id !== categoryId), updatedAt: new Date() })
  }

  const handleAddTag = () => {
    if (tagFilter.trim()) {
      const newTag: Tag = {
        id: Date.now().toString(),
        name: tagFilter.trim(),
        color: "blue",
      }
      onAddTag(newTag)
      if (note) {
        onUpdateNote({ ...note, tagIds: [...note.tagIds, newTag.id], updatedAt: new Date() })
      }
      setTagFilter("")
      setIsAddingTag(false)
    }
  }

  const handleAddCategoryViaSettings = () => {
    if (categoryFilter.trim() && onOpenSettingsWithCategory) {
      onOpenSettingsWithCategory(categoryFilter.trim())
      setIsAddingCategory(false)
      setCategoryFilter("")
    }
  }

  const filteredTags = useMemo(() => {
    if (!tagFilter.trim()) return tags.filter((tag) => !note?.tagIds.includes(tag.id))
    return tags.filter(
      (tag) => !note?.tagIds.includes(tag.id) && tag.name.toLowerCase().includes(tagFilter.toLowerCase()),
    )
  }, [tags, tagFilter, note?.tagIds])

  const filteredCategories = useMemo(() => {
    if (!categoryFilter.trim()) return categories.filter((cat) => !note?.categoryIds.includes(cat.id))
    return categories.filter(
      (cat) => !note?.categoryIds.includes(cat.id) && cat.name.toLowerCase().includes(categoryFilter.toLowerCase()),
    )
  }, [categories, categoryFilter, note?.categoryIds])

  const handleCategoryClick = (categoryId: string, e: React.MouseEvent) => {
    if (!e.defaultPrevented && onSearchByCategory) {
      onSearchByCategory(categoryId)
    }
  }

  const handleTagClick = (tagId: string, e: React.MouseEvent) => {
    if (!e.defaultPrevented && onSearchByTag) {
      onSearchByTag(tagId)
    }
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Select a note to view or edit</p>
        </div>
      </div>
    )
  }

  const noteTags = tags.filter((tag) => note.tagIds.includes(tag.id))
  const noteCategories = categories.filter((cat) => note.categoryIds.includes(cat.id))

  return (
    <div className="flex-1 flex flex-col px-0 md:px-4 pb-3">
      <div className="flex-1 bg-background md:rounded-xl md:border md:border-border md:shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled Note"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>Updated {formatRelativeTime(note.updatedAt)}</span>
              {isTyping && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                    <span>Typing...</span>
                  </div>
                </>
              )}
              {isSaving && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving</span>
                  </div>
                </>
              )}
              {isSaved && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEnriched(false)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  !showEnriched
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <FileText className="h-3 w-3" />
                <span>Original</span>
              </button>
              <button
                onClick={() => setShowEnriched(true)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  showEnriched
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>Enriched</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {showEnriched ? (
            <div className="prose prose-sm max-w-none">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">AI-Enhanced Summary</h3>
                <p className="text-foreground text-sm leading-relaxed">
                  This note discusses important aspects related to {title.toLowerCase()}. The content provides valuable
                  insights and actionable information.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1.5">Key Points:</h4>
                  <ul className="list-disc list-inside space-y-1 text-foreground text-sm">
                    <li>Main topic focuses on structured information organization</li>
                    <li>Emphasis on clarity and actionable insights</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <LexicalEditor content={content} onChange={handleContentChange} />
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/30 space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">CATEGORIES</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noteCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={(e) => handleCategoryClick(category.id, e)}
                  className={cn(
                    "group px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                    tagColorClasses[category.color as keyof typeof tagColorClasses],
                  )}
                >
                  {category.name}
                  <X
                    className="h-3 w-3 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemoveCategory(category.id, e)
                    }}
                  />
                </button>
              ))}

              <Popover
                open={isAddingCategory}
                onOpenChange={(open) => {
                  setIsAddingCategory(open)
                  if (!open) setCategoryFilter("")
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Add Category</div>
                    <Input
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      placeholder="Search or add category..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => {
                              handleToggleCategory(category.id)
                              setIsAddingCategory(false)
                              setCategoryFilter("")
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                          >
                            {category.name}
                          </button>
                        ))
                      ) : categoryFilter.trim() ? (
                        <button
                          onClick={handleAddCategoryViaSettings}
                          className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-primary font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 inline mr-2" />
                          Add Category "{categoryFilter}"
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Type to search or add</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">TAGS</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noteTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={(e) => handleTagClick(tag.id, e)}
                  className={cn(
                    "group px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                    tagColorClasses[tag.color as keyof typeof tagColorClasses],
                  )}
                >
                  {tag.name}
                  <X
                    className="h-3 w-3 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemoveTag(tag.id, e)
                    }}
                  />
                </button>
              ))}

              <Popover
                open={isAddingTag}
                onOpenChange={(open) => {
                  setIsAddingTag(open)
                  if (!open) setTagFilter("")
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Add Tag</div>
                    <Input
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagFilter.trim() && filteredTags.length === 0) {
                          handleAddTag()
                        }
                      }}
                      placeholder="Search or add tag..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredTags.length > 0 ? (
                        filteredTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              handleToggleTag(tag.id)
                              setIsAddingTag(false)
                              setTagFilter("")
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                          >
                            {tag.name}
                          </button>
                        ))
                      ) : tagFilter.trim() ? (
                        <button
                          onClick={handleAddTag}
                          className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-primary font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 inline mr-2" />
                          Add Tag "{tagFilter}"
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Type to search or add</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
