"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/lib/types";
import { useEffect, useRef } from "react";

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryData: Pick<Category, "name" | "enrichmentPrompt" | "noEnrichment"> | null;
  onUpdateCategory: (field: keyof Pick<Category, "name" | "enrichmentPrompt" | "noEnrichment">, value: string | boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isEditing?: boolean;
}

export function CategoryModal({
  open,
  onOpenChange,
  categoryData,
  onUpdateCategory,
  onSave,
  onCancel,
  isSaving = false,
  isEditing = false,
}: CategoryModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>

        {categoryData && (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="modal-category-name" className="text-sm font-medium">
                Category Name
              </Label>
              <Input
                ref={inputRef}
                id="modal-category-name"
                value={categoryData.name}
                onChange={(e) =>
                  onUpdateCategory("name", e.target.value)
                }
                placeholder="Enter category name"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="modal-no-enrichment" className="text-sm font-medium">
                AI Enrichment
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Off</span>
                <Switch
                  id="modal-no-enrichment"
                  checked={!categoryData.noEnrichment}
                  onCheckedChange={(checked) =>
                    onUpdateCategory("noEnrichment", !checked)
                  }
                />
                <span className="text-xs text-muted-foreground">On</span>
              </div>
            </div>

            {!categoryData.noEnrichment && (
              <div className="space-y-2">
                <Label htmlFor="modal-enrichment-prompt" className="text-xs font-medium">
                  AI Enrichment Prompt
                </Label>
                <Textarea
                  id="modal-enrichment-prompt"
                  value={categoryData.enrichmentPrompt}
                  onChange={(e) =>
                    onUpdateCategory("enrichmentPrompt", e.target.value)
                  }
                  placeholder="Enter custom prompt..."
                  className="min-h-24 font-mono text-sm"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={onSave}
                disabled={isSaving || !categoryData.name.trim()}
                className="flex-1"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
