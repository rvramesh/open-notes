"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/settings-types";
import { Sparkles, FileText } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface CategorySelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSelect: (categoryId: string | null) => void; // null for Auto Classify
}

export function CategorySelectionModal({
  open,
  onOpenChange,
  categories,
  onSelect,
}: CategorySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter categories: manual ones (noEnrichment: true) + Auto Classify if any AI category exists
  const manualCategories = useMemo(
    () => categories.filter((cat) => cat.noEnrichment === true),
    [categories]
  );

  const hasAICategories = useMemo(
    () => categories.some((cat) => !cat.noEnrichment),
    [categories]
  );

  // Build options list
  const options = useMemo(() => {
    const opts: Array<{ id: string | null; name: string; isAutoClassify: boolean; category?: Category }> = [];
    
    // Add manual categories
    manualCategories.forEach((cat) => {
      opts.push({ id: cat.id, name: cat.name, isAutoClassify: false, category: cat });
    });

    // Add AI Auto Classify if AI categories exist
    if (hasAICategories) {
      opts.push({ id: null, name: "AI Auto Classify", isAutoClassify: true });
    }

    return opts;
  }, [manualCategories, hasAICategories]);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.name.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Reset selected index when filtered options change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0 && selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[selectedIndex].id);
      }
    }
  };

  const handleSelect = (categoryId: string | null) => {
    onSelect(categoryId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Note Type</DialogTitle>
          <DialogDescription>
            Select a category for your new note or let AI automatically classify it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full"
          />

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredOptions.map((option, index) => {
              const isSelected = index === selectedIndex;
              
              if (option.isAutoClassify) {
                return (
                  <button
                    key="auto-classify"
                    onClick={() => handleSelect(null)}
                    className={cn(
                      "w-full flex items-center gap-1 px-4 py-3 rounded-md border transition-all text-left",
                      "hover:bg-muted",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary border-primary"
                    )}
                  >
                    <Sparkles className="h-5 w-5 shrink-0" />
                    <div 
                      className="h-4 w-4 rounded shrink-0 invisible"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">AI Auto Classify</p>
                      <p className="text-xs text-muted-foreground opacity-70">Let AI decide</p>
                    </div>
                  </button>
                );
              }

              const category = option.category!;
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelect(category.id)}
                  className={cn(
                    "w-full flex items-center gap-1 px-4 py-3 rounded-md border transition-all text-left",
                    "hover:bg-muted",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary border-primary"
                  )}
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <div 
                    className="h-4 w-4 rounded shrink-0"
                    style={{ backgroundColor: `var(--color-${category.color})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{category.name}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredOptions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No categories found matching "{searchQuery}"</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Use ↑↓ to navigate, Enter to select
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
