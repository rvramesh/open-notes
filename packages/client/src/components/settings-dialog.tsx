import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCategoriesStore } from "@/lib/store";
import { FolderTree, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdateCategories?: (categories: Category[]) => void; // Deprecated, kept for compatibility
  onCategoryCreated?: (categoryId: string) => void; // Callback when new category is created
  preSelectTab?: "ai" | "categories";
  preFillCategoryName?: string;
}

export function SettingsDialog({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
  preSelectTab,
  preFillCategoryName,
}: SettingsDialogProps) {
  const createCategory = useCategoriesStore((state) => state.createCategory);
  const updateCategory = useCategoriesStore((state) => state.updateCategory);
  const deleteCategory = useCategoriesStore((state) => state.deleteCategory);
  const getCategoryByName = useCategoriesStore((state) => state.getCategoryByName);

  const [apiEndpoint, setApiEndpoint] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [editingCategories, setEditingCategories] = useState(categories);
  const [activeTab, setActiveTab] = useState<"ai" | "categories">("ai");
  const [newCategoryIds, setNewCategoryIds] = useState<Set<string>>(new Set()); // Track new categories

  useEffect(() => {
    if (isOpen) {
      setEditingCategories(categories);
      setNewCategoryIds(new Set());
      if (preSelectTab) {
        setActiveTab(preSelectTab);
      }
      if (preFillCategoryName && preSelectTab === "categories") {
        // Add new category with pre-filled name at the top
        const tempId = `temp-${Date.now()}`;
        const newCategory: Category = {
          id: tempId,
          name: preFillCategoryName,
          color: "blue",
          aiPrompt: "",
        };
        setEditingCategories((prev) => [newCategory, ...prev]);
        setNewCategoryIds(new Set([tempId]));
        
        // Focus the input after a short delay
        setTimeout(() => {
          const input = document.getElementById(`category-name-${tempId}`) as HTMLInputElement;
          input?.focus();
          input?.select(); // Also select the text so user can start typing immediately
        }, 100);
      }
    }
  }, [isOpen, categories, preSelectTab, preFillCategoryName]);

  const handleSaveCategories = async () => {
    let createdCategoryId: string | null = null;

    // Process categories: create new ones, update existing ones
    for (const category of editingCategories) {
      if (newCategoryIds.has(category.id)) {
        // This is a new category - create it
        const newId = await createCategory(category.name, category.aiPrompt);
        if (preFillCategoryName && category.name === preFillCategoryName) {
          createdCategoryId = newId;
        }
      } else {
        // This is an existing category - update it
        await updateCategory(category.id, {
          name: category.name,
          color: category.color,
          aiPrompt: category.aiPrompt,
        });
      }
    }

    // Notify parent if a new category was created (for auto-adding to note)
    if (createdCategoryId && onCategoryCreated) {
      onCategoryCreated(createdCategoryId);
    }

    onClose();
  };

  const handleUpdateCategory = (id: string, field: keyof Category, value: string) => {
    setEditingCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat))
    );
  };

  const handleDeleteCategory = async (id: string) => {
    setEditingCategories((prev) => prev.filter((cat) => cat.id !== id));
    setNewCategoryIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Only delete from store if it's not a new category
    if (!newCategoryIds.has(id)) {
      await deleteCategory(id);
    }
  };

  const handleAddNewCategory = () => {
    const tempId = `temp-${Date.now()}`;
    const newCategory: Category = {
      id: tempId,
      name: "",
      color: "blue",
      aiPrompt: "",
    };
    setEditingCategories((prev) => [newCategory, ...prev]); // Add to top
    setNewCategoryIds((prev) => new Set(prev).add(tempId));
    
    // Focus the input after a short delay to allow DOM to update
    setTimeout(() => {
      const input = document.getElementById(`category-name-${tempId}`) as HTMLInputElement;
      input?.focus();
    }, 50);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Reset editing state when closing without saving
        setEditingCategories(categories);
        setNewCategoryIds(new Set());
      }
      onClose();
    }}>
      <DialogContent className="max-w-3xl lg:max-w-5xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your workspace preferences</DialogDescription>
        </DialogHeader>

        <div className="hidden md:flex h-[calc(85vh-120px)]">
          <div className="w-56 border-r border-border bg-muted/30 p-3 space-y-1">
            <button
              onClick={() => setActiveTab("ai")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "ai"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              <span>AI Configuration</span>
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "categories"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <FolderTree className="h-4 w-4" />
              <span>Categories</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "ai" && (
              <div className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="api-endpoint">API Endpoint</Label>
                  <Input
                    id="api-endpoint"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your AI service endpoint URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key will be stored securely
                  </p>
                </div>

                <Button onClick={onClose} className="w-full">
                  Save AI Configuration
                </Button>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Configure categories and their AI enrichment prompts
                  </p>
                  <Button
                    onClick={handleAddNewCategory}
                    size="sm"
                    variant="outline"
                  >
                    Add Category
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {editingCategories.map((category) => (
                    <div
                      key={category.id}
                      className="p-4 border border-border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Input
                          id={`category-name-${category.id}`}
                          value={category.name}
                          onChange={(e) =>
                            handleUpdateCategory(category.id, "name", e.target.value)
                          }
                          className="flex-1 mr-2"
                          placeholder="Category name"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`prompt-${category.id}`} className="text-xs">
                          AI Enrichment Prompt
                        </Label>
                        <Textarea
                          id={`prompt-${category.id}`}
                          value={category.aiPrompt}
                          onChange={(e) =>
                            handleUpdateCategory(category.id, "aiPrompt", e.target.value)
                          }
                          placeholder="Enter custom prompt for AI enrichment..."
                          className="min-h-[80px] text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button onClick={handleSaveCategories} className="w-full">
                    Save Categories
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile accordion view */}
        <div className="md:hidden h-[calc(85vh-120px)] overflow-y-auto p-4">
          <Accordion type="single" collapsible defaultValue={activeTab}>
            <AccordionItem value="ai">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>AI Configuration</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint-mobile">API Endpoint</Label>
                    <Input
                      id="api-endpoint-mobile"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your AI service endpoint URL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key-mobile">API Key</Label>
                    <Input
                      id="api-key-mobile"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key will be stored securely
                    </p>
                  </div>

                  <Button onClick={onClose} className="w-full">
                    Save AI Configuration
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="categories">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  <span>Categories</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Configure categories and their AI enrichment prompts
                  </p>

                  <div className="space-y-4">
                    {editingCategories.map((category) => (
                      <div
                        key={category.id}
                        className="p-3 border border-border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Input
                            value={category.name}
                            onChange={(e) =>
                              handleUpdateCategory(category.id, "name", e.target.value)
                            }
                            className="flex-1 mr-2 text-sm"
                            placeholder="Category name"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`prompt-mobile-${category.id}`} className="text-xs">
                            AI Enrichment Prompt
                          </Label>
                          <Textarea
                            id={`prompt-mobile-${category.id}`}
                            value={category.aiPrompt}
                            onChange={(e) =>
                              handleUpdateCategory(category.id, "aiPrompt", e.target.value)
                            }
                            placeholder="Enter custom prompt for AI enrichment..."
                            className="min-h-[80px] text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleSaveCategories} className="w-full">
                    Save Categories
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
