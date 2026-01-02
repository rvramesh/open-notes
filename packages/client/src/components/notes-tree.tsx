"use client";

import { AboutDialog } from "@/components/about-dialog"; // Import AboutDialog component
import { Button } from "@/components/ui/button";
import type { Category, Note, Tag } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { format, isThisWeek, isToday } from "date-fns";
import {
  Brain,
  Calendar,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Info,
  List,
  Loader2,
  SettingsIcon,
  X,
} from "lucide-react";
import { useState } from "react";

type ViewMode = "category" | "time" | "flat" | "search";

interface NotesTreeProps {
  notes: Note[];
  tags: Tag[];
  categories: Category[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onOpenSettings: () => void;
  isSearchActive: boolean;
  searchQuery: string;
  searchResults: Note[];
  onClearSearch: () => void;
}

export function NotesTree({
  notes,
  tags,
  categories,
  selectedNoteId,
  onSelectNote,
  onOpenSettings,
  isSearchActive,
  searchQuery,
  searchResults,
  onClearSearch,
}: NotesTreeProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false); // Add state for about dialog

  const effectiveViewMode = isSearchActive ? "search" : viewMode;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const renderCategoryView = () => {
    return categories.map((category) => {
      const categoryNotes = notes.filter((note) => note.categories.includes(category.id));
      const isExpanded = expandedCategories.has(category.id);

      return (
        <div key={category.id} className="mb-0.5">
          <button
            onClick={() => toggleCategory(category.id)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground text-sm">{category.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">{categoryNotes.length}</span>
          </button>
          {isExpanded && (
            <div className="ml-5 mt-0.5 space-y-0.5">
              {categoryNotes.map((note) => (
                <NoteItem
                  key={`${category.id}-${note.id}`}
                  note={note}
                  isSelected={note.id === selectedNoteId}
                  onSelect={() => onSelectNote(note.id)}
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const renderTimeView = () => {
    const todayNotes = notes.filter((note) => isToday(note.updatedAt));
    const thisWeekNotes = notes.filter(
      (note) => isThisWeek(note.updatedAt) && !isToday(note.updatedAt)
    );
    const olderNotes = notes.filter((note) => !isThisWeek(note.updatedAt));

    return (
      <>
        {todayNotes.length > 0 && (
          <TimeGroup
            title="Today"
            notes={todayNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        )}
        {thisWeekNotes.length > 0 && (
          <TimeGroup
            title="This Week"
            notes={thisWeekNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        )}
        {olderNotes.length > 0 && (
          <TimeGroup
            title="Older"
            notes={olderNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        )}
      </>
    );
  };

  const renderFlatView = () => {
    return notes.map((note) => (
      <NoteItem
        key={note.id}
        note={note}
        isSelected={note.id === selectedNoteId}
        onSelect={() => onSelectNote(note.id)}
      />
    ));
  };

  const renderSearchResults = () => {
    const displayedResults = searchResults.slice(0, displayCount);
    const hasMore = displayCount < searchResults.length;

    const handleLoadMore = () => {
      setIsLoadingMore(true);
      setTimeout(() => {
        setDisplayCount((prev) => prev + 20);
        setIsLoadingMore(false);
      }, 500);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="text-sm font-medium text-foreground">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
          </div>
          <Button variant="ghost" size="sm" onClick={onClearSearch} className="h-6 w-6 p-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {displayedResults.map((note) => (
          <SearchResultCard
            key={note.id}
            note={note}
            isSelected={note.id === selectedNoteId}
            onSelect={() => onSelectNote(note.id)}
          />
        ))}
        {hasMore && (
          <div className="px-2 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full h-8 text-xs bg-transparent"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load More (${searchResults.length - displayCount} remaining)`
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-screen">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-semibold">Open Notes</span>
      </div>

      {!isSearchActive && (
        <div className="bg-background">
          <div className="flex w-full border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("category")}
              className={cn(
                "flex-1 h-9 text-xs rounded-none border-r border-b-2 transition-all",
                viewMode === "category"
                  ? "border-b-primary/80 border-r-border bg-accent text-foreground border-b-[3px]"
                  : "border-b-transparent border-r-border hover:bg-muted/50"
              )}
            >
              <FolderTree className="h-3.5 w-3.5 mr-1" />
              Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("time")}
              className={cn(
                "flex-1 h-9 text-xs rounded-none border-r border-b-2 transition-all",
                viewMode === "time"
                  ? "border-b-primary/80 border-r-border bg-accent text-foreground border-b-[3px]"
                  : "border-b-transparent border-r-border hover:bg-muted/50"
              )}
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Time
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("flat")}
              className={cn(
                "flex-1 h-9 text-xs rounded-none border-b-2 transition-all",
                viewMode === "flat"
                  ? "border-b-primary/80 bg-accent text-foreground border-b-[3px]"
                  : "border-b-transparent hover:bg-muted/50"
              )}
            >
              <List className="h-3.5 w-3.5 mr-1" />
              Flat
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {effectiveViewMode === "search" && renderSearchResults()}
        {effectiveViewMode === "category" && renderCategoryView()}
        {effectiveViewMode === "time" && renderTimeView()}
        {effectiveViewMode === "flat" && renderFlatView()}
      </div>

      {/* Pinned Settings Section */}
      <div className="border-t border-border p-2 space-y-0.5 bg-muted/30">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground text-sm">Settings</span>
        </button>
        <button
          onClick={() => setIsAboutOpen(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground text-sm">About</span>
        </button>
      </div>

      {isAboutOpen && <AboutDialog onClose={() => setIsAboutOpen(false)} />}
    </div>
  );
}

function TimeGroup({
  title,
  notes,
  selectedNoteId,
  onSelectNote,
}: {
  title: string;
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="font-medium text-foreground text-sm">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{notes.length}</span>
      </button>
      {isExpanded && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onSelect={() => onSelectNote(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteItem({
  note,
  isSelected,
  onSelect,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
      )}
    >
      <span className="truncate flex-1 text-left text-sm">{note.title}</span>
      <span className="ml-2 text-xs text-muted-foreground shrink-0">
        {format(note.updatedAt, "MMM d")}
      </span>
    </button>
  );
}

function SearchResultCard({
  note,
  isSelected,
  onSelect,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // Extract excerpt from content blocks
  let excerpt = "";
  if (note.contentBlocks && note.contentBlocks.length > 0) {
    const textBlocks = note.contentBlocks
      .map((block) => {
        if (typeof block.content === 'string') {
          return block.content;
        }
        if (block.content && typeof block.content === 'object' && 'text' in block.content) {
          return (block.content as any).text;
        }
        return '';
      })
      .filter(text => text.trim());
    
    const fullText = textBlocks.join(' ');
    excerpt = fullText.slice(0, 100).trim() + (fullText.length > 100 ? "..." : "");
  }

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col w-full rounded-lg p-2.5 text-left transition-colors border",
        isSelected ? "bg-primary/10 border-primary/20" : "bg-card border-border hover:bg-accent"
      )}
    >
      <div className="font-medium text-sm text-foreground mb-1 line-clamp-1">{note.title}</div>
      {excerpt && (
        <div className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
          {excerpt}
        </div>
      )}
      <div className="text-xs text-muted-foreground">{formatRelativeTime(note.updatedAt)}</div>
    </button>
  );
}
