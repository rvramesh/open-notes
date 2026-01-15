"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Note } from "@/lib/types";
import { Command, PanelLeft, PanelLeftOpen, Plus, Search } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";

interface CommandPaletteProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  isLeftBarCollapsed: boolean;
  onToggleLeftBar: () => void;
  onOpenSettings: () => void;
  onCreateNote: () => void;
  onSearch: (query: string) => void;
}

export function CommandPalette({
  notes,
  onSelectNote,
  isLeftBarCollapsed,
  onToggleLeftBar,
  onOpenSettings,
  onCreateNote,
  onSearch,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isMac, setIsMac] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMacOS = /mac/.test(userAgent);
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
      userAgent
    );
    const isElectronApp = navigator.userAgent.toLowerCase().includes("electron");
    setIsElectron(isElectronApp);
    setIsMac(isMacOS);
    setIsMobile(isMobileDevice);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey) && (isElectron || e.altKey)) {
        console.log("New note shortcut triggered");
        e.preventDefault();
        onCreateNote();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onCreateNote]);

  const filteredNotes = useMemo(() => 
    notes.filter((note) =>
      note.title.toLowerCase().includes(search.toLowerCase())
    ),
    [notes, search]
  );
  const hasResults = filteredNotes.length > 0;

  const handleSearchSubmit = useCallback(() => {
    if (search.trim()) {
      onSearch(search);
      setOpen(false);
    }
  }, [search, onSearch]);

  return (
    <>
      <div className="sticky top-0 h-12 md:h-14 bg-transparent flex items-center gap-2 md:gap-3 px-2 md:px-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLeftBar}
          className="h-9 w-9 p-0 rounded-lg bg-background border border-border shadow-sm hover:bg-accent shrink-0"
        >
          {isLeftBarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        <button
          onClick={() => setOpen(true)}
          className="flex-1  h-9 md:h-10 px-3 md:px-4 rounded-lg border border-border bg-background flex items-center gap-2 md:gap-3 text-sm text-muted-foreground hover:bg-accent transition-colors shadow-sm grow"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Search or type a command...</span>
          <span className="sm:hidden">Search...</span>
          {!isMobile && (
            <kbd className="ml-auto pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              {isMac ? <Command className="h-3 w-3" /> : <span className="text-xs">Ctrl</span>}
              <span>+</span>
              <span>K</span>
            </kbd>
          )}
        </button>

        <Button
          onClick={onCreateNote}
          size="sm"
          className="h-9 md:h-10 rounded-lg shadow-sm shrink-0 px-2 md:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline ml-2">New Note</span>
          {!isMobile && (
            <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium ml-2">
              {isMac ? (
                <>
                  <Command className="h-3 w-3" />
                  <span>+</span>
                  {!isElectron && (
                    <>
                      <span>⌥</span>
                      <span>+</span>
                    </>
                  )}
                  <span>N</span>
                </>
              ) : (
                <>
                  <span className="text-xs">Ctrl</span>
                  <span>+</span>
                  {!isElectron && (
                    <>
                      <span>Alt</span>
                      <span>+</span>
                    </>
                  )}
                  <span>N</span>
                </>
              )}
            </kbd>
          )}
        </Button>

        <ThemeToggle />
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search notes or type a command..."
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim()) {
              handleSearchSubmit();
            }
          }}
        />
        <CommandList>
          <CommandEmpty>
            <div className="py-6 text-center text-sm">
              <p className="text-muted-foreground mb-3">No results found for "{search}"</p>
              <Button
                onClick={() => {
                  onCreateNote();
                  setOpen(false);
                  setSearch("");
                }}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create new note
              </Button>
            </div>
          </CommandEmpty>

          {hasResults && (
            <CommandGroup heading="Notes">
              {filteredNotes.map((note) => (
                <CommandItem
                  key={note.id}
                  onSelect={() => {
                    onSelectNote(note.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {note.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                onCreateNote();
                setOpen(false);
                setSearch("");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Note
            </CommandItem>
            <CommandItem
              onSelect={() => {
                onOpenSettings();
                setOpen(false);
                setSearch("");
              }}
            >
              Open Settings
            </CommandItem>
            <CommandItem
              onSelect={() => {
                onToggleLeftBar();
                setOpen(false);
                setSearch("");
              }}
            >
              Toggle Sidebar
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
