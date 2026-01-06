"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Category, Note, Tag } from "@/lib/types";
import { cn, formatRelativeTime, isMacOS } from "@/lib/utils";
import { normalizeTag, getTagColor } from "@/lib/tag-utils";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { debounce } from "lodash";
import { PlateEditor } from "./plate-editor";
import { useSettings } from "@/hooks/use-settings";
import { CategoryModal } from "@/components/category-modal";

interface NoteEditorProps {
  note: Note | null;
  noteId: string | null;
  tags: Tag[];
  categories: Category[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onAddTag: (tagName: string) => Promise<string>;
  onAddCategory: (category: Category) => Promise<string>;
  onRemoveTag: (tagId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onOpenSettingsWithCategory?: (categoryName: string) => void;
  onSearchByCategory?: (categoryId: string) => void;
  onSearchByTag?: (tagId: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

const tagColorClasses = {
  rose: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/30 dark:text-rose-300",
  pink: "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-950/30 dark:text-pink-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-300",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/30 dark:text-purple-300",
  violet: "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950/30 dark:text-violet-300",
  indigo: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300",
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  sky: "bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950/30 dark:text-sky-300",
  cyan: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300",
  teal: "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-950/30 dark:text-teal-300",
  emerald: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300",
  green: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-300",
  lime: "bg-lime-100 text-lime-700 hover:bg-lime-200 dark:bg-lime-950/30 dark:text-lime-300",
  yellow: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300",
  amber: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
  orange: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/30 dark:text-orange-300",
  red: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-300",
  warmGray: "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-950/30 dark:text-stone-300",
  coolGray: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-950/30 dark:text-gray-300",
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-950/30 dark:text-slate-300",
};

export function NoteEditor({
  note,
  noteId,
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
  onDeleteNote,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [showEnriched, setShowEnriched] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Category modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [modalCategoryData, setModalCategoryData] = useState<Pick<Category, "name" | "enrichmentPrompt" | "noEnrichment"> | null>(null);

  const [hasChanges, setHasChanges] = useState(false);
  const settings = useSettings();
  const pendingContentRef = useRef<string | null>(null);
  const saveInProgressRef = useRef<boolean>(false);
  const noteIdRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const latestTitleRef = useRef<string>("");
  const latestContentStringRef = useRef<string>("");
  const onUpdateNoteRef = useRef(onUpdateNote);

  // Serialize contentBlocks to JSON string for the editor
  const contentString = useMemo(() => {
    if (!note || !note.contentBlocks || note.contentBlocks.length === 0) {
      return "";
    }
    return JSON.stringify(note.contentBlocks);
  }, [note?.id, note?.contentBlocks]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      pendingContentRef.current = null; // Clear pending changes when switching notes
      setHasChanges(false);
      setIsSaved(true);
      
      // Focus title input when a new note is loaded
      setTimeout(() => titleInputRef.current?.focus(), 0);
    } else {
      setTitle("");
      pendingContentRef.current = null;
      setHasChanges(false);
      setIsSaved(true);
    }
  }, [note?.id]);

  // Keep refs up to date with latest values
  useEffect(() => {
    latestTitleRef.current = title;
    latestContentStringRef.current = contentString;
    onUpdateNoteRef.current = onUpdateNote;
    noteIdRef.current = noteId;
  }, [title, contentString, onUpdateNote, noteId]);

  // Create debounced save function using the save delay from settings (in seconds, convert to ms)
  // Recreate when settings change
  const debouncedSave = useMemo(() => {
    return debounce(async () => {
      if (!noteIdRef.current || saveInProgressRef.current) return;

      setIsSaving(true);
      saveInProgressRef.current = true;

      try {
        let contentBlocks = [];
        try {
          const contentToSave = pendingContentRef.current || latestContentStringRef.current;
          if (contentToSave) {
            contentBlocks = JSON.parse(contentToSave);
          }
        } catch (e) {
          console.error("Failed to parse content blocks:", e);
        }

        await onUpdateNoteRef.current(noteIdRef.current, {
          title: latestTitleRef.current,
          contentBlocks,
        });

        setIsSaving(false);
        setIsSaved(true);
        setHasChanges(false);
        pendingContentRef.current = null;
      } catch (error) {
        console.error("Failed to save note:", error);
        setIsSaving(false);
        setIsSaved(false);
      } finally {
        saveInProgressRef.current = false;
      }
    }, (settings.editorSettings.autoSaveInterval || 10) * 1000);
  }, [settings.editorSettings.autoSaveInterval]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleSaveNow = useCallback(async () => {
    if (!noteIdRef.current || !hasChanges || saveInProgressRef.current) return;

    // Cancel pending debounced save
    debouncedSave.cancel();

    setIsSaving(true);
    saveInProgressRef.current = true;

    try {
      let contentBlocks = [];
      try {
        // Use pending content ref which has the latest from the editor
        const contentToSave = pendingContentRef.current || latestContentStringRef.current;
        if (contentToSave) {
          contentBlocks = JSON.parse(contentToSave);
        }
      } catch (e) {
        console.error("Failed to parse content blocks:", e);
      }

      await onUpdateNote(noteIdRef.current, {
        title: latestTitleRef.current,
        contentBlocks,
      });

      setIsSaving(false);
      setIsSaved(true);
      setHasChanges(false);
      pendingContentRef.current = null;
    } catch (error) {
      console.error("Failed to save note:", error);
      setIsSaving(false);
      setIsSaved(false);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [hasChanges, onUpdateNote, debouncedSave]);

  // Handle Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (macOS)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's save dialog
        handleSaveNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSaveNow]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
    setIsSaved(false);
    if (settings.editorSettings.autoSave) {
      debouncedSave();
    }
  };

  const handleTitleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save immediately
      await handleSaveNow();
      // Focus the editor
      const editableElement = editorContainerRef.current?.querySelector('[contenteditable="true"]') as HTMLElement;
      editableElement?.focus();
    }
  };

  const handleContentChange = (newContent: string) => {
    // Only mark as changed if content actually differs
    const currentContent = contentString || "";
    if (newContent !== currentContent) {
      pendingContentRef.current = newContent;
      setHasChanges(true);
      setIsSaved(false);
      if (settings.editorSettings.autoSave) {
        debouncedSave();
      }
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (!noteId || !note) return;
    const newUserTags = note.tags.user.includes(tagId)
      ? note.tags.user.filter((id) => id !== tagId)
      : [...note.tags.user, tagId];
    onUpdateNote(noteId, {
      tags: {
        ...note.tags,
        user: newUserTags,
      },
    });
  };

  const handleToggleCategory = (categoryId: string) => {
    if (!noteId || !note) return;
    // If same category, remove it; otherwise set it
    const newCategory = note.category === categoryId ? undefined : categoryId;
    onUpdateNote(noteId, { category: newCategory });
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!noteId || !note) return;
    onUpdateNote(noteId, {
      tags: {
        ...note.tags,
        user: note.tags.user.filter((id) => id !== tagId),
      },
    });
  };

  const handleRemoveCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!noteId || !note) return;
    onUpdateNote(noteId, {
      category: undefined,
    });
  };

  const handleAddTag = async () => {
    if (tagFilter.trim() && noteId && note) {
      // Normalize the tag name
      const normalizedTag = normalizeTag(tagFilter);
      
      // Add tag to the store (returns the normalized tag string)
      const tagString = await onAddTag(normalizedTag);
      
      // Add the tag to the note's user tags
      await onUpdateNote(noteId, {
        tags: {
          ...note.tags,
          user: [...note.tags.user, tagString],
        },
      });
      
      setTagFilter("");
      setIsAddingTag(false);
    }
  };

  const handleOpenCategoryModal = () => {
    const categoryName = categoryFilter.trim();
    if (!categoryName) return;
    
    setModalCategoryData({
      name: categoryName,
      enrichmentPrompt: "",
      noEnrichment: false,
    });
    setCategoryModalOpen(true);
    setIsAddingCategory(false);
  };

  const handleModalCategorySave = async () => {
    if (!modalCategoryData || !noteId || !note) return;
    if (!modalCategoryData.name.trim()) return;

    const newCategory: Category = {
      id: `temp-${Date.now()}`,
      name: modalCategoryData.name,
      color: "blue",
      enrichmentPrompt: modalCategoryData.enrichmentPrompt,
      noEnrichment: modalCategoryData.noEnrichment,
    };

    // Create category and get the actual ID
    const categoryId = await onAddCategory(newCategory);

    // Set as note's category
    await onUpdateNote(noteId, {
      category: categoryId,
    });

    // Reset states
    setCategoryModalOpen(false);
    setModalCategoryData(null);
    setCategoryFilter("");
  };

  const handleModalCategoryCancel = () => {
    setCategoryModalOpen(false);
    setModalCategoryData(null);
    setCategoryFilter("");
  };

  const handleUpdateModalCategory = (field: keyof Pick<Category, "name" | "enrichmentPrompt" | "noEnrichment">, value: string | boolean) => {
    if (modalCategoryData) {
      setModalCategoryData({
        ...modalCategoryData,
        [field]: value,
      });
    }
  };

  const filteredTags = useMemo(() => {
    if (!tagFilter.trim()) return tags.filter((tag) => !note?.tags.user.includes(tag.id));
    const normalized = normalizeTag(tagFilter);
    return tags.filter(
      (tag) =>
        !note?.tags.user.includes(tag.id) && tag.name.includes(normalized)
    );
  }, [tags, tagFilter, note?.tags]);

  const filteredCategories = useMemo(() => {
    if (!categoryFilter.trim())
      return categories.filter((cat) => cat.id !== note?.category);
    return categories.filter(
      (cat) =>
        cat.id !== note?.category &&
        cat.name.toLowerCase().includes(categoryFilter.toLowerCase())
    );
  }, [categories, categoryFilter, note?.category]);

  // Compute selected indices directly instead of using useEffect
  const computedCategoryIndex = useMemo(() => {
    if (!isAddingCategory) return -1;
    if (filteredCategories.length === 1) return 0;
    if (filteredCategories.length === 0 && categoryFilter.trim()) return 0;
    return -1;
  }, [filteredCategories.length, categoryFilter, isAddingCategory]);

  const computedTagIndex = useMemo(() => {
    if (!isAddingTag) return -1;
    if (filteredTags.length === 1) return 0;
    if (filteredTags.length === 0 && tagFilter.trim()) return 0;
    return -1;
  }, [filteredTags.length, tagFilter, isAddingTag]);

  const handleCategoryClick = (categoryId: string, e: React.MouseEvent) => {
    if (!e.defaultPrevented && onSearchByCategory) {
      onSearchByCategory(categoryId);
    }
  };

  const handleTagClick = (tagId: string, e: React.MouseEvent) => {
    if (!e.defaultPrevented && onSearchByTag) {
      onSearchByTag(tagId);
    }
  };

  const handleExportPDF = () => {
    if (!note) return;

    // Extract text content from blocks
    const blockTexts = note.contentBlocks.map((block) => {
      if (typeof block.content === 'string') {
        return block.content;
      }
      return JSON.stringify(block.content);
    });

    // Create a formatted text version of the note
    const createdDate = new Date(note.createdAt).toLocaleDateString();
    const updatedDate = new Date(note.updatedAt).toLocaleDateString();
    const noteContent = `${note.title}\n\nCreated: ${createdDate}\nUpdated: ${updatedDate}\n\n${blockTexts.join('\n\n')}`;

    // Create a blob and download
    const blob = new Blob([noteContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteNote = () => {
    if (note && onDeleteNote) {
      onDeleteNote(note.id);
      setIsDeleteDialogOpen(false);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Select a note to view or edit</p>
        </div>
      </div>
    );
  }

  const noteTags = tags.filter((tag) => note.tags.user.includes(tag.id));
  const noteCategory = note.category ? categories.find((cat) => cat.id === note.category) : undefined;

  return (
    <div className="flex-1 flex flex-col px-0 md:px-4 pb-3 min-h-0 notes-section">
      <div className="flex-1 bg-background md:rounded-xl md:border md:border-border md:shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="p-3 border-b border-border">
          <input
            ref={titleInputRef}
            type="text"
            value={title === "Untitled Note" ? "" : title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled Note"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>Updated {formatRelativeTime(note.updatedAt)}</span>
              {hasChanges && !isSaving && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      Unsaved changes
                      {!settings.editorSettings.autoSave && (
                        <span className="ml-1 text-xs">— Press {isMacOS() ? '⌘S' : 'Ctrl+S'} to save</span>
                      )}
                    </span>
                  </div>
                </>
              )}
              {isSaving && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>Enriched</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {showEnriched ? (
            <div className="prose prose-sm max-w-none  p-4">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  AI-Enhanced Summary
                </h3>
                <p className="text-foreground text-sm leading-relaxed">
                  This note discusses important aspects related to {title.toLowerCase()}. The
                  content provides valuable insights and actionable information.
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
            <PlateEditor ref={editorContainerRef} content={contentString} onChange={handleContentChange} noteId={noteId} onBlur={handleSaveNow} />
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">CATEGORY</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noteCategory && (
                <button
                  key={noteCategory.id}
                  onClick={(e) => handleCategoryClick(noteCategory.id, e)}
                  className={cn(
                    "group px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                    tagColorClasses[noteCategory.color as keyof typeof tagColorClasses]
                  )}
                >
                  {noteCategory.name}
                  <X
                    className="h-3 w-3 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveCategory(noteCategory.id, e);
                    }}
                  />
                </button>
              )}

              {!noteCategory && (
                <Popover
                  open={isAddingCategory}
                  onOpenChange={(open) => {
                    setIsAddingCategory(open);
                    if (!open) {
                      setCategoryFilter("");
                      setSelectedCategoryIndex(-1);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Add Category
                      </div>
                      <Input
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          // Reset manual selection when typing
                          if (selectedCategoryIndex !== -1) {
                            setSelectedCategoryIndex(-1);
                          }
                        }}
                        onKeyDown={(e) => {
                          const maxIndex = filteredCategories.length > 0 ? filteredCategories.length - 1 : 0;
                          const currentIndex = selectedCategoryIndex === -1 ? computedCategoryIndex : selectedCategoryIndex;
                          
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setSelectedCategoryIndex((prev) => {
                              const current = prev === -1 ? computedCategoryIndex : prev;
                              return Math.min(current + 1, maxIndex);
                            });
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setSelectedCategoryIndex((prev) => {
                              const current = prev === -1 ? computedCategoryIndex : prev;
                              return Math.max(current - 1, -1);
                            });
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const indexToUse = selectedCategoryIndex !== -1 ? selectedCategoryIndex : computedCategoryIndex;
                            if (filteredCategories.length > 0 && indexToUse >= 0) {
                              // Select existing category
                              handleToggleCategory(filteredCategories[indexToUse].id);
                              setIsAddingCategory(false);
                              setCategoryFilter("");
                              setSelectedCategoryIndex(-1);
                            } else if (categoryFilter.trim() && filteredCategories.length === 0) {
                              // Add new category
                              handleOpenCategoryModal();
                              setSelectedCategoryIndex(-1);
                            }
                          }
                        }}
                        placeholder="Search or add category..."
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category, index) => {
                            const isSelected = (selectedCategoryIndex === -1 ? computedCategoryIndex : selectedCategoryIndex) === index;
                            return (
                              <button
                                key={category.id}
                                onClick={() => {
                                  handleToggleCategory(category.id);
                                  setIsAddingCategory(false);
                                  setCategoryFilter("");
                                  setSelectedCategoryIndex(-1);
                                }}
                                className={cn(
                                  "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors",
                                  isSelected && "bg-accent"
                                )}
                              >
                                {category.name}
                              </button>
                            );
                          })
                        ) : categoryFilter.trim() ? (
                          <button
                            onClick={handleOpenCategoryModal}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-primary font-medium",
                              (selectedCategoryIndex === -1 ? computedCategoryIndex : selectedCategoryIndex) === 0 && "bg-accent"
                            )}
                          >
                            <Plus className="h-3.5 w-3.5 inline mr-2" />
                            Add Category "{categoryFilter}"
                          </button>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Type to search or add
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
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
                    tagColorClasses[tag.color as keyof typeof tagColorClasses]
                  )}
                >
                  {tag.name}
                  <X
                    className="h-3 w-3 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveTag(tag.id, e);
                    }}
                  />
                </button>
              ))}

              <Popover
                open={isAddingTag}
                onOpenChange={(open) => {
                  setIsAddingTag(open);
                  if (!open) {
                    setTagFilter("");
                    setSelectedTagIndex(-1);
                  }
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
                      onChange={(e) => {
                        setTagFilter(e.target.value);
                        // Reset manual selection when typing
                        if (selectedTagIndex !== -1) {
                          setSelectedTagIndex(-1);
                        }
                      }}
                      onKeyDown={(e) => {
                        const maxIndex = filteredTags.length > 0 ? filteredTags.length - 1 : 0;
                        const currentIndex = selectedTagIndex === -1 ? computedTagIndex : selectedTagIndex;
                        
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSelectedTagIndex((prev) => {
                            const current = prev === -1 ? computedTagIndex : prev;
                            return Math.min(current + 1, maxIndex);
                          });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSelectedTagIndex((prev) => {
                            const current = prev === -1 ? computedTagIndex : prev;
                            return Math.max(current - 1, -1);
                          });
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const indexToUse = selectedTagIndex !== -1 ? selectedTagIndex : computedTagIndex;
                          if (filteredTags.length > 0 && indexToUse >= 0) {
                            // Select existing tag
                            handleToggleTag(filteredTags[indexToUse].id);
                            setIsAddingTag(false);
                            setTagFilter("");
                            setSelectedTagIndex(-1);
                          } else if (tagFilter.trim() && filteredTags.length === 0) {
                            // Add new tag
                            handleAddTag();
                            setSelectedTagIndex(-1);
                          }
                        }
                      }}
                      placeholder="Search or add tag..."
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredTags.length > 0 ? (
                        filteredTags.map((tag, index) => {
                          const isSelected = (selectedTagIndex === -1 ? computedTagIndex : selectedTagIndex) === index;
                          return (
                            <button
                              key={tag.id}
                              onClick={() => {
                                handleToggleTag(tag.id);
                                setIsAddingTag(false);
                                setTagFilter("");
                                setSelectedTagIndex(-1);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors",
                                isSelected && "bg-accent"
                              )}
                            >
                              {tag.name}
                            </button>
                          );
                        })
                      ) : tagFilter.trim() ? (
                        <button
                          onClick={handleAddTag}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-primary font-medium",
                            (selectedTagIndex === -1 ? computedTagIndex : selectedTagIndex) === 0 && "bg-accent"
                          )}
                        >
                          <Plus className="h-3.5 w-3.5 inline mr-2" />
                          Add Tag "{tagFilter}"
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Type to search or add
                        </p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{note.title}"? This action cannot be undone and the
              note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        categoryData={modalCategoryData}
        onUpdateCategory={handleUpdateModalCategory}
        onSave={handleModalCategorySave}
        onCancel={handleModalCategoryCancel}
        isEditing={false}
      />
    </div>
  );
}
