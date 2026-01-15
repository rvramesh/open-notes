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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { CategoryModal } from "@/components/category-modal";
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
import { useCategoriesStore } from "@/lib/store";
import { FolderTree, Settings, Trash2, Type, Eye, Pencil, Sparkles, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[]; // Deprecated, now uses settings store
  onUpdateCategories?: (categories: Category[]) => void; // Deprecated
  onCategoryCreated?: (categoryId: string) => void; // Callback when new category is created
  preSelectTab?: "ai" | "categories" | "appearance" | "editor" | "prompts";
  preFillCategoryName?: string;
}

export function SettingsDialog({
  isOpen,
  onClose,
  onCategoryCreated,
  preSelectTab,
  preFillCategoryName,
}: SettingsDialogProps) {
  const settingsStore = useSettings();
  const categoriesStore = useCategoriesStore();
  const categoriesMap = categoriesStore.categories;
  const allCategories = useMemo(() => Object.values(categoriesMap), [categoriesMap]);

  const [editingCategories, setEditingCategories] = useState<Category[]>(allCategories);
  const [activeTab, setActiveTab] = useState<"ai" | "categories" | "appearance" | "editor" | "prompts">("ai");
  const [newCategoryIds, setNewCategoryIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states for editing/adding categories
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [modalCategoryData, setModalCategoryData] = useState<Category | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Model accordion state
  const languageModelDefaultOpen = !settingsStore.languageModel?.modelName || !settingsStore.languageModel?.apiKey;
  const embeddingModelDefaultOpen = !settingsStore.embeddingModel?.modelName || !settingsStore.embeddingModel?.apiKey;

  // Sync with categories store
  useEffect(() => {
    setEditingCategories(allCategories);
  }, [allCategories]);

  useEffect(() => {
    if (isOpen) {
      setEditingCategories(allCategories);
      setNewCategoryIds(new Set());
      if (preSelectTab) {
        setActiveTab(preSelectTab);
      }
      if (preFillCategoryName && preSelectTab === "categories") {
        // Open the category modal directly with a pre-filled name
        const tempId = `temp-${Date.now()}`;
        const newCategory: Category = {
          id: tempId,
          name: preFillCategoryName,
          color: "blue",
          enrichmentPrompt: "",
          noEnrichment: false,
        };
        setModalCategoryData(newCategory);
        setEditingCategoryId(tempId);
        setNewCategoryIds(new Set([tempId]));
        setModalOpen(true);
      }
    }
  }, [isOpen, preSelectTab, preFillCategoryName, allCategories]);

  const handleUpdateCategory = (field: keyof Category, value: string | boolean) => {
    if (modalCategoryData) {
      setModalCategoryData({
        ...modalCategoryData,
        [field]: value,
      });
    }
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
      await categoriesStore.deleteCategory(id);
    }
  };

  const handleDeleteCategoryWithConfirm = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleAddNewCategory = () => {
    const tempId = `temp-${Date.now()}`;
    const newCategory: Category = {
      id: tempId,
      name: "",
      color: "blue",
      enrichmentPrompt: "",
      noEnrichment: false,
    };
    setModalCategoryData(newCategory);
    setEditingCategoryId(tempId);
    setNewCategoryIds((prev) => new Set(prev).add(tempId));
    setModalOpen(true);
  };

  const handleEditCategory = (categoryId: string) => {
    const category = editingCategories.find((c) => c.id === categoryId);
    if (category) {
      setModalCategoryData({ ...category });
      setEditingCategoryId(categoryId);
      setModalOpen(true);
    }
  };

  const handleModalSave = async () => {
    if (!modalCategoryData || !editingCategoryId) return;
    
    setIsSaving(true);
    try {
      if (newCategoryIds.has(editingCategoryId)) {
        // New category
        const newId = await categoriesStore.createCategory(
          modalCategoryData.name,
          modalCategoryData.enrichmentPrompt
        );
        if (modalCategoryData.color !== "blue" || modalCategoryData.noEnrichment) {
          await categoriesStore.updateCategory(newId, {
            color: modalCategoryData.color,
            noEnrichment: modalCategoryData.noEnrichment,
          });
        }
        if (preFillCategoryName && modalCategoryData.name === preFillCategoryName && onCategoryCreated) {
          onCategoryCreated(newId);
        }
      } else {
        // Existing category
        await categoriesStore.updateCategory(editingCategoryId, {
          name: modalCategoryData.name,
          color: modalCategoryData.color,
          enrichmentPrompt: modalCategoryData.enrichmentPrompt,
          noEnrichment: modalCategoryData.noEnrichment,
        });
      }
      setModalOpen(false);
      setEditingCategoryId(null);
      setModalCategoryData(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalCancel = () => {
    // Remove from editing categories if it's a new unsaved category
    if (editingCategoryId && newCategoryIds.has(editingCategoryId)) {
      setEditingCategories((prev) =>
        prev.filter((cat) => cat.id !== editingCategoryId)
      );
      setNewCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(editingCategoryId);
        return next;
      });
    }
    setModalOpen(false);
    setEditingCategoryId(null);
    setModalCategoryData(null);
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Reset editing state when closing without saving
        setEditingCategories(settingsStore.categories);
        setNewCategoryIds(new Set());
      }
      onClose();
    }}>
      <DialogContent className="md:max-w-3xl max-w-md lg:max-w-5xl max-h-[85vh] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your workspace preferences</DialogDescription>
        </DialogHeader>

        <div className="hidden md:flex h-[calc(85vh-120px)]">
          <div className="w-56 border-r border-border bg-muted/30 p-3 space-y-1">
            <button
              onClick={() => setActiveTab("appearance")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "appearance"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Type className="h-4 w-4" />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "editor"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Pencil className="h-4 w-4" />
              <span>Editor</span>
            </button>
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
              <span>Model Configuration</span>
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "prompts"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Prompts</span>
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

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
            {activeTab === "appearance" ? (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Appearance Settings</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Customize the look and feel of your workspace
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select
                    value={settingsStore.fontSize}
                    onValueChange={(value) => settingsStore.setFontSize(value as 'sm' | 'md' | 'lg' | 'xl')}
                  >
                    <SelectTrigger id="font-size">
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="xl">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Adjust the base font size for better readability
                  </p>
                </div>
              </div>
            ) : activeTab === "editor" ? (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Editor Settings</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure editor behavior and features
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-save">Auto Save</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically save changes as you type
                    </p>
                  </div>
                  <Switch
                    id="auto-save"
                    checked={settingsStore.editorSettings.autoSave}
                    onCheckedChange={(checked) =>
                      settingsStore.setEditorSetting("autoSave", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-save-interval">Save Delay After Typing</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="auto-save-interval"
                      type="number"
                      min="1"
                      step="1"
                      value={settingsStore.editorSettings.autoSaveInterval ?? 10}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          // Allow clearing temporarily
                          return;
                        }
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          settingsStore.setEditorSetting(
                            "autoSaveInterval",
                            Math.max(1, numValue)
                          );
                        }
                      }}
                      onBlur={(e) => {
                        // On blur, ensure we have a valid value
                        const value = parseInt(e.target.value);
                        if (isNaN(value) || value < 1) {
                          settingsStore.setEditorSetting("autoSaveInterval", 10);
                        }
                      }}
                      disabled={!settingsStore.editorSettings.autoSave}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground min-w-fit">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Waits this long after you stop typing before automatically saving your note. Minimum: 1 second. If cleared, defaults to 10 seconds.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrichment-delay">Enrichment Delay After Save</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="enrichment-delay"
                      type="number"
                      min="1"
                      step="1"
                      value={settingsStore.editorSettings.enrichmentDelay ?? 10}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          return;
                        }
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          settingsStore.setEditorSetting(
                            "enrichmentDelay",
                            Math.max(1, numValue)
                          );
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value);
                        if (isNaN(value) || value < 1) {
                          settingsStore.setEditorSetting("enrichmentDelay", 10);
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground min-w-fit">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Waits this long after saving before triggering AI categorization and enrichment. Only processes if note remains unchanged.
                  </p>
                </div>
              </div>
            ) : activeTab === "ai" ? (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Model Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure your AI models for text generation and semantic search
                  </p>
                </div>

                <Accordion type="multiple" defaultValue={[...(languageModelDefaultOpen ? ["language"] : []), ...(embeddingModelDefaultOpen ? ["embedding"] : [])]} className="space-y-4">
                  <AccordionItem value="language">
                    <AccordionTrigger className="text-base font-semibold">
                      <div className="flex items-center gap-2">
                        <span>Language Model</span>
                        <span className="text-xs text-muted-foreground font-normal">({settingsStore.languageModel?.provider || 'openai'} / {settingsStore.languageModel?.modelName || 'not configured'})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Configure your primary AI model for text generation and enrichment
                        </p>

                <div className="space-y-2">
                  <Label htmlFor="language-provider">Provider</Label>
                  <Select
                    value={settingsStore.languageModel?.provider || 'openai'}
                    onValueChange={(value) =>
                      settingsStore.setLanguageModel({
                        provider: value as 'openai' | 'anthropic' | 'ollama' | 'custom',
                        modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                        baseUrl: settingsStore.languageModel?.baseUrl || "",
                        apiKey: settingsStore.languageModel?.apiKey || "",
                      })
                    }
                  >
                    <SelectTrigger id="language-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select your AI model provider
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language-model-name">Model Name</Label>
                  <Input
                    id="language-model-name"
                    value={settingsStore.languageModel?.modelName || ""}
                    onChange={(e) =>
                      settingsStore.setLanguageModel({
                        provider: settingsStore.languageModel?.provider || 'openai',
                        modelName: e.target.value,
                        baseUrl: settingsStore.languageModel?.baseUrl || "",
                        apiKey: settingsStore.languageModel?.apiKey || "",
                      })
                    }
                    placeholder="e.g., gpt-4, claude-3-opus, llama2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the model identifier (e.g., gpt-4, claude-3-opus, llama2)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language-api-endpoint">API Endpoint</Label>
                  <Input
                    id="language-api-endpoint"
                    value={settingsStore.languageModel?.baseUrl || ""}
                    onChange={(e) =>
                      settingsStore.setLanguageModel({
                        provider: settingsStore.languageModel?.provider || 'openai',
                        modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                        baseUrl: e.target.value,
                        apiKey: settingsStore.languageModel?.apiKey || "",
                      })
                    }
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your AI service endpoint URL (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language-api-key">API Key</Label>
                  <Input
                    id="language-api-key"
                    type="password"
                    value={settingsStore.languageModel?.apiKey || ""}
                    onChange={(e) =>
                      settingsStore.setLanguageModel({
                        provider: settingsStore.languageModel?.provider || 'openai',
                        modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                        baseUrl: settingsStore.languageModel?.baseUrl || "",
                        apiKey: e.target.value,
                      })
                    }
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key will be stored securely (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Headers</Label>
                    <Button

                      variant="outline"
                      onClick={() => {
                        const newHeader = {
                          id: `header-${Date.now()}-${Math.random()}`,
                          name: '',
                          value: '',
                        };
                        const updatedHeaders = [...(settingsStore.languageModel?.customHeaders || []), newHeader];
                        settingsStore.setLanguageModel({
                          provider: settingsStore.languageModel?.provider || 'openai',
                          modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                          baseUrl: settingsStore.languageModel?.baseUrl || "",
                          apiKey: settingsStore.languageModel?.apiKey || "",
                          customHeaders: updatedHeaders,
                        });
                      }}
                    >
                      Add Header
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add custom HTTP headers to be sent with API requests
                  </p>
                  
                  {(settingsStore.languageModel?.customHeaders || []).length > 0 && (
                    <div className="space-y-2 mt-3 p-3 bg-muted rounded-md">
                      <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <div>Header Name</div>
                        <div>Header Value</div>
                        <div />
                      </div>
                      {settingsStore.languageModel?.customHeaders?.map((header, index) => (
                        <div key={header.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
                          <Input
                            aria-label="Header name"
                            aria-labelledby={`lang-header-name-group-${header.id}`}
                            id={`lang-header-name-${header.id}`}
                            placeholder="e.g., X-Custom-Header"
                            value={header.name}
                            onChange={(e) => {
                              const updated = settingsStore.languageModel?.customHeaders?.map(h =>
                                h.id === header.id ? { ...h, name: e.target.value } : h
                              ) || [];
                              settingsStore.setLanguageModel({
                                provider: settingsStore.languageModel?.provider || 'openai',
                                modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                                baseUrl: settingsStore.languageModel?.baseUrl || "",
                                apiKey: settingsStore.languageModel?.apiKey || "",
                                customHeaders: updated,
                              });
                            }}
                          />
                          <Input
                            aria-label="Header value"
                            aria-labelledby={`lang-header-value-group-${header.id}`}
                            id={`lang-header-value-${header.id}`}
                            placeholder="header value"
                            value={header.value}
                            onChange={(e) => {
                              const updated = settingsStore.languageModel?.customHeaders?.map(h =>
                                h.id === header.id ? { ...h, value: e.target.value } : h
                              ) || [];
                              settingsStore.setLanguageModel({
                                provider: settingsStore.languageModel?.provider || 'openai',
                                modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                                baseUrl: settingsStore.languageModel?.baseUrl || "",
                                apiKey: settingsStore.languageModel?.apiKey || "",
                                customHeaders: updated,
                              });
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Delete header"
                            onClick={() => {
                              const updated = settingsStore.languageModel?.customHeaders?.filter(h => h.id !== header.id) || [];
                              settingsStore.setLanguageModel({
                                provider: settingsStore.languageModel?.provider || 'openai',
                                modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                                baseUrl: settingsStore.languageModel?.baseUrl || "",
                                apiKey: settingsStore.languageModel?.apiKey || "",
                                customHeaders: updated,
                              });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="embedding">
                    <AccordionTrigger className="text-base font-semibold">
                      <div className="flex items-center gap-2">
                        <span>Embedding Model</span>
                        <span className="text-xs text-muted-foreground font-normal">({settingsStore.embeddingModel?.provider || 'openai'} / {settingsStore.embeddingModel?.modelName || 'not configured'})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Configure your embedding model for semantic search and similarity
                        </p>

                <div className="space-y-2">
                  <Label htmlFor="embedding-provider">Provider</Label>
                  <Select
                    value={settingsStore.embeddingModel?.provider || 'openai'}
                    onValueChange={(value) =>
                      settingsStore.setEmbeddingModel({
                        provider: value as 'openai' | 'anthropic' | 'ollama' | 'custom',
                        modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                        baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                        apiKey: settingsStore.embeddingModel?.apiKey || "",
                      })
                    }
                  >
                    <SelectTrigger id="embedding-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select your embedding model provider
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedding-model-name">Model Name</Label>
                  <Input
                    id="embedding-model-name"
                    value={settingsStore.embeddingModel?.modelName || ""}
                    onChange={(e) =>
                      settingsStore.setEmbeddingModel({
                        provider: settingsStore.embeddingModel?.provider || 'openai',
                        modelName: e.target.value,
                        baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                        apiKey: settingsStore.embeddingModel?.apiKey || "",
                      })
                    }
                    placeholder="e.g., text-embedding-3-small, nomic-embed-text"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the model identifier (e.g., text-embedding-3-small, nomic-embed-text)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedding-api-endpoint">API Endpoint</Label>
                  <Input
                    id="embedding-api-endpoint"
                    value={settingsStore.embeddingModel?.baseUrl || ""}
                    onChange={(e) =>
                      settingsStore.setEmbeddingModel({
                        provider: settingsStore.embeddingModel?.provider || 'openai',
                        modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                        baseUrl: e.target.value,
                        apiKey: settingsStore.embeddingModel?.apiKey || "",
                      })
                    }
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your embedding service endpoint URL (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedding-api-key">API Key</Label>
                  <Input
                    id="embedding-api-key"
                    type="password"
                    value={settingsStore.embeddingModel?.apiKey || ""}
                    onChange={(e) =>
                      settingsStore.setEmbeddingModel({
                        provider: settingsStore.embeddingModel?.provider || 'openai',
                        modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                        baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                        apiKey: e.target.value,
                      })
                    }
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key will be stored securely (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Headers</Label>
                    <Button

                      variant="outline"
                      onClick={() => {
                        const newHeader = {
                          id: `header-${Date.now()}-${Math.random()}`,
                          name: '',
                          value: '',
                        };
                        const updatedHeaders = [...(settingsStore.embeddingModel?.customHeaders || []), newHeader];
                        settingsStore.setEmbeddingModel({
                          provider: settingsStore.embeddingModel?.provider || 'openai',
                          modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                          baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                          apiKey: settingsStore.embeddingModel?.apiKey || "",
                          customHeaders: updatedHeaders,
                        });
                      }}
                    >
                      Add Header
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add custom HTTP headers to be sent with API requests
                  </p>
                  
                  {(settingsStore.embeddingModel?.customHeaders || []).length > 0 && (
                    <div className="space-y-2 mt-3 p-3 bg-muted rounded-md">
                      <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground mb-2">
                        <div>Header Name</div>
                        <div>Header Value</div>
                        <div />
                      </div>
                      {settingsStore.embeddingModel?.customHeaders?.map((header, index) => (
                        <div key={header.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
                          <Input
                            aria-label="Header name"
                            aria-labelledby={`emb-header-name-group-${header.id}`}
                            id={`emb-header-name-${header.id}`}
                            placeholder="e.g., X-Custom-Header"
                            value={header.name}
                            onChange={(e) => {
                              const updated = settingsStore.embeddingModel?.customHeaders?.map(h =>
                                h.id === header.id ? { ...h, name: e.target.value } : h
                              ) || [];
                              settingsStore.setEmbeddingModel({
                                provider: settingsStore.embeddingModel?.provider || 'openai',
                                modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                                baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                                apiKey: settingsStore.embeddingModel?.apiKey || "",
                                customHeaders: updated,
                              });
                            }}
                          />
                          <Input
                            aria-label="Header value"
                            aria-labelledby={`emb-header-value-group-${header.id}`}
                            id={`emb-header-value-${header.id}`}
                            placeholder="header value"
                            value={header.value}
                            onChange={(e) => {
                              const updated = settingsStore.embeddingModel?.customHeaders?.map(h =>
                                h.id === header.id ? { ...h, value: e.target.value } : h
                              ) || [];
                              settingsStore.setEmbeddingModel({
                                provider: settingsStore.embeddingModel?.provider || 'openai',
                                modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                                baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                                apiKey: settingsStore.embeddingModel?.apiKey || "",
                                customHeaders: updated,
                              });
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Delete header"
                            onClick={() => {
                              const updated = settingsStore.embeddingModel?.customHeaders?.filter(h => h.id !== header.id) || [];
                              settingsStore.setEmbeddingModel({
                                provider: settingsStore.embeddingModel?.provider || 'openai',
                                modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                                baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                                apiKey: settingsStore.embeddingModel?.apiKey || "",
                                customHeaders: updated,
                              });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ) : activeTab === "prompts" ? (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI Prompts</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure prompts for AI categorization
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <span className="font-semibold">Note:</span> When a note is manually categorized with a category that has AI Enrichment turned off, 
                    the note content will not be shared with AI for automatic enrichment. This helps protect sensitive information.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-recognition-prompt">Category Recognition Prompt</Label>
                  <Textarea
                    id="category-recognition-prompt"
                    value={settingsStore.categoryRecognitionPrompt}
                    onChange={(e) =>
                      settingsStore.setCategoryRecognitionPrompt(e.target.value)
                    }
                    placeholder="Enter the prompt for automatic category recognition..."
                    className="min-h-37.5 max-h-[30vh] font-mono text-sm overflow-y-auto resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This template uses Jinja2 syntax and automatically includes all your configured categories. 
                    Use {"{% for category in categories %}"} to iterate through them.
                  </p>
                </div>
              </div>
            ) : activeTab === "categories" ? (
              <div className="flex flex-col h-full overflow-hidden">
                <ScrollArea className="flex-1 min-h-0">
                  <div className="pr-4 space-y-6">
                    <div className="space-y-4 pb-4 border-b border-border">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Generic Enrichment Prompt</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          This prompt is applied to all categories as a base instruction
                        </p>
                      </div>
                      <Textarea
                        id="generic-enrichment-categories"
                        value={settingsStore.genericEnrichmentPrompt}
                        onChange={(e) =>
                          settingsStore.setGenericEnrichmentPrompt(e.target.value)
                        }
                        placeholder="Enter the generic prompt that will be applied to all categories..."
                        className="min-h-25 max-h-[30vh] font-mono text-sm overflow-y-auto resize-none"
                      />
                      <p className="text-xs text-muted-foreground italic">
                        Example: "Enhance. Never modify the original intent / meaning —only add valuable insights."
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Categories</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure category-specific enrichment prompts (automatically combined with generic prompt)
                        </p>
                      </div>
                      <Button
                        onClick={handleAddNewCategory}

                        variant="outline"
                        disabled={modalOpen}
                      >
                        Add Category
                      </Button>
                    </div>

                    <Accordion type="multiple" className="space-y-3">
                      {editingCategories.map((category) => (
                        <AccordionItem key={category.id} value={category.id}>
                          <AccordionTrigger className="text-sm font-medium hover:no-underline">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="font-medium truncate">{category.name || "Unnamed Category"}</span>
                              <span className={cn(
                                "text-xs font-normal px-2 py-1 rounded whitespace-nowrap",
                                category.noEnrichment 
                                  ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100"
                                  : "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100"
                              )}>
                                {category.noEnrichment ? "AI Enrichment Off" : "AI Enrichment On"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    role="button"
                                    aria-label="View details"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">View</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    role="button"
                                    aria-label="Edit category"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditCategory(category.id);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    role="button"
                                    aria-label="Delete category"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCategoryWithConfirm(category.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground"><strong>Name:</strong> {category.name || "—"}</p>
                                <p className="text-sm text-muted-foreground"><strong>AI Enrichment:</strong> {category.noEnrichment ? "Off" : "On"}</p>
                                {!category.noEnrichment && category.enrichmentPrompt && (
                                  <div>
                                    <p className="text-sm text-muted-foreground"><strong>Prompt:</strong></p>
                                    <p className="text-sm font-mono bg-muted/50 p-2 rounded mt-1 whitespace-pre-wrap break-word">
                                      {category.enrichmentPrompt}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </ScrollArea>
              </div>
            ) : null}
          </div>
            </ScrollArea>
          </div>
        </div>

        {/* Mobile accordion view */}
        <div className="md:hidden h-[calc(85vh-120px)] overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
          <Accordion type="single" collapsible value={activeTab} onValueChange={(value) => setActiveTab(value as "ai" | "categories" | "appearance" | "editor" | "prompts")}>
            <AccordionItem value="appearance">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span>Appearance</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="font-size-mobile">Font Size</Label>
                    <Select
                      value={settingsStore.fontSize}
                      onValueChange={(value) => settingsStore.setFontSize(value as 'sm' | 'md' | 'lg' | 'xl')}
                    >
                      <SelectTrigger id="font-size-mobile">
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="editor">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  <span>Editor</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-save-mobile">Auto Save</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically save changes
                      </p>
                    </div>
                    <Switch
                      id="auto-save-mobile"
                      checked={settingsStore.editorSettings.autoSave}
                      onCheckedChange={(checked) =>
                        settingsStore.setEditorSetting("autoSave", checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto-save-interval-mobile">Save Delay After Typing</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="auto-save-interval-mobile"
                        type="number"
                        min="1"
                        step="1"
                        value={settingsStore.editorSettings.autoSaveInterval ?? 10}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            // Allow clearing temporarily
                            return;
                          }
                          const numValue = parseInt(value);
                          if (!isNaN(numValue)) {
                            settingsStore.setEditorSetting(
                              "autoSaveInterval",
                              Math.max(1, numValue)
                            );
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, ensure we have a valid value
                          const value = parseInt(e.target.value);
                          if (isNaN(value) || value < 1) {
                            settingsStore.setEditorSetting("autoSaveInterval", 10);
                          }
                        }}
                        disabled={!settingsStore.editorSettings.autoSave}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground min-w-fit">seconds</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Waits this long after you stop typing before automatically saving. Minimum: 1 second. If cleared, defaults to 10 seconds.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="enrichment-delay-mobile">Enrichment Delay After Save</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="enrichment-delay-mobile"
                        type="number"
                        min="1"
                        step="1"
                        value={settingsStore.editorSettings.enrichmentDelay ?? 10}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            return;
                          }
                          const numValue = parseInt(value);
                          if (!isNaN(numValue)) {
                            settingsStore.setEditorSetting(
                              "enrichmentDelay",
                              Math.max(1, numValue)
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (isNaN(value) || value < 1) {
                            settingsStore.setEditorSetting("enrichmentDelay", 10);
                          }
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground min-w-fit">seconds</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Waits this long after saving before triggering AI categorization and enrichment. Only processes if note remains unchanged.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Model Configuration</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <Accordion type="multiple" defaultValue={[...(languageModelDefaultOpen ? ["language-mobile"] : []), ...(embeddingModelDefaultOpen ? ["embedding-mobile"] : [])]} className="space-y-2">
                    <AccordionItem value="language-mobile">
                      <AccordionTrigger className="text-sm font-semibold py-2">
                        <div className="flex items-center gap-2">
                          <span>Language Model</span>
                          <span className="text-xs text-muted-foreground font-normal">({settingsStore.languageModel?.provider || 'openai'} / {settingsStore.languageModel?.modelName || 'not configured'})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="language-provider-mobile">Provider</Label>
                      <Select
                        value={settingsStore.languageModel?.provider || 'openai'}
                        onValueChange={(value) =>
                          settingsStore.setLanguageModel({
                            provider: value as 'openai' | 'anthropic' | 'ollama' | 'custom',
                            modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                            baseUrl: settingsStore.languageModel?.baseUrl || "",
                            apiKey: settingsStore.languageModel?.apiKey || "",
                          })
                        }
                      >
                        <SelectTrigger id="language-provider-mobile">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="ollama">Ollama</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language-model-name-mobile">Model Name</Label>
                      <Input
                        id="language-model-name-mobile"
                        value={settingsStore.languageModel?.modelName || ""}
                        onChange={(e) =>
                          settingsStore.setLanguageModel({
                            provider: settingsStore.languageModel?.provider || 'openai',
                            modelName: e.target.value,
                            baseUrl: settingsStore.languageModel?.baseUrl || "",
                            apiKey: settingsStore.languageModel?.apiKey || "",
                          })
                        }
                        placeholder="e.g., gpt-4, claude-3-opus"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language-api-endpoint-mobile">API Endpoint</Label>
                      <Input
                        id="language-api-endpoint-mobile"
                        value={settingsStore.languageModel?.baseUrl || ""}
                        onChange={(e) =>
                          settingsStore.setLanguageModel({
                            provider: settingsStore.languageModel?.provider || 'openai',
                            modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                            baseUrl: e.target.value,
                            apiKey: settingsStore.languageModel?.apiKey || "",
                          })
                        }
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language-api-key-mobile">API Key</Label>
                      <Input
                        id="language-api-key-mobile"
                        type="password"
                        value={settingsStore.languageModel?.apiKey || ""}
                        onChange={(e) =>
                          settingsStore.setLanguageModel({
                            provider: settingsStore.languageModel?.provider || 'openai',
                            modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                            baseUrl: settingsStore.languageModel?.baseUrl || "",
                            apiKey: e.target.value,
                          })
                        }
                        placeholder="sk-..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Custom Headers</Label>
                        <Button

                          variant="outline"
                          onClick={() => {
                            const newHeader = {
                              id: `header-${Date.now()}-${Math.random()}`,
                              name: '',
                              value: '',
                            };
                            const updatedHeaders = [...(settingsStore.languageModel?.customHeaders || []), newHeader];
                            settingsStore.setLanguageModel({
                              provider: settingsStore.languageModel?.provider || 'openai',
                              modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                              baseUrl: settingsStore.languageModel?.baseUrl || "",
                              apiKey: settingsStore.languageModel?.apiKey || "",
                              customHeaders: updatedHeaders,
                            });
                          }}
                        >
                          Add Header
                        </Button>
                      </div>
                      
                      {(settingsStore.languageModel?.customHeaders || []).length > 0 && (
                        <div className="space-y-2 mt-3 p-3 bg-muted rounded-md">
                          <div className="text-xs font-medium text-muted-foreground mb-2 grid grid-cols-[1fr_40px] gap-2">
                            <div>Header Name / Value</div>
                            <div />
                          </div>
                          {settingsStore.languageModel?.customHeaders?.map((header, index) => (
                            <div key={header.id} className="space-y-2">
                              <Input
                                aria-label="Header name"
                                id={`lang-header-name-mobile-${header.id}`}
                                placeholder="e.g., X-Custom-Header"
                                value={header.name}
                                onChange={(e) => {
                                  const updated = settingsStore.languageModel?.customHeaders?.map(h =>
                                    h.id === header.id ? { ...h, name: e.target.value } : h
                                  ) || [];
                                  settingsStore.setLanguageModel({
                                    provider: settingsStore.languageModel?.provider || 'openai',
                                    modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                                    baseUrl: settingsStore.languageModel?.baseUrl || "",
                                    apiKey: settingsStore.languageModel?.apiKey || "",
                                    customHeaders: updated,
                                  });
                                }}
                              />
                              <div className="flex gap-2 items-end">
                                <Input
                                  aria-label="Header value"
                                  id={`lang-header-value-mobile-${header.id}`}
                                  placeholder="header value"
                                  value={header.value}
                                  onChange={(e) => {
                                    const updated = settingsStore.languageModel?.customHeaders?.map(h =>
                                      h.id === header.id ? { ...h, value: e.target.value } : h
                                    ) || [];
                                    settingsStore.setLanguageModel({
                                      provider: settingsStore.languageModel?.provider || 'openai',
                                      modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                                      baseUrl: settingsStore.languageModel?.baseUrl || "",
                                      apiKey: settingsStore.languageModel?.apiKey || "",
                                      customHeaders: updated,
                                    });
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Delete header"
                                  onClick={() => {
                                    const updated = settingsStore.languageModel?.customHeaders?.filter(h => h.id !== header.id) || [];
                                    settingsStore.setLanguageModel({
                                      provider: settingsStore.languageModel?.provider || 'openai',
                                      modelName: settingsStore.languageModel?.modelName || 'gpt-4',
                                      baseUrl: settingsStore.languageModel?.baseUrl || "",
                                      apiKey: settingsStore.languageModel?.apiKey || "",
                                      customHeaders: updated,
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="embedding-mobile">
                      <AccordionTrigger className="text-sm font-semibold py-2">
                        <div className="flex items-center gap-2">
                          <span>Embedding Model</span>
                          <span className="text-xs text-muted-foreground font-normal">({settingsStore.embeddingModel?.provider || 'openai'} / {settingsStore.embeddingModel?.modelName || 'not configured'})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="embedding-provider-mobile">Provider</Label>
                      <Select
                        value={settingsStore.embeddingModel?.provider || 'openai'}
                        onValueChange={(value) =>
                          settingsStore.setEmbeddingModel({
                            provider: value as 'openai' | 'anthropic' | 'ollama' | 'custom',
                            modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                            baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                            apiKey: settingsStore.embeddingModel?.apiKey || "",
                          })
                        }
                      >
                        <SelectTrigger id="embedding-provider-mobile">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="ollama">Ollama</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="embedding-model-name-mobile">Model Name</Label>
                      <Input
                        id="embedding-model-name-mobile"
                        value={settingsStore.embeddingModel?.modelName || ""}
                        onChange={(e) =>
                          settingsStore.setEmbeddingModel({
                            provider: settingsStore.embeddingModel?.provider || 'openai',
                            modelName: e.target.value,
                            baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                            apiKey: settingsStore.embeddingModel?.apiKey || "",
                          })
                        }
                        placeholder="e.g., text-embedding-3-small"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="embedding-api-endpoint-mobile">API Endpoint</Label>
                      <Input
                        id="embedding-api-endpoint-mobile"
                        value={settingsStore.embeddingModel?.baseUrl || ""}
                        onChange={(e) =>
                          settingsStore.setEmbeddingModel({
                            provider: settingsStore.embeddingModel?.provider || 'openai',
                            modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                            baseUrl: e.target.value,
                            apiKey: settingsStore.embeddingModel?.apiKey || "",
                          })
                        }
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="embedding-api-key-mobile">API Key</Label>
                      <Input
                        id="embedding-api-key-mobile"
                        type="password"
                        value={settingsStore.embeddingModel?.apiKey || ""}
                        onChange={(e) =>
                          settingsStore.setEmbeddingModel({
                            provider: settingsStore.embeddingModel?.provider || 'openai',
                            modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                            baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                            apiKey: e.target.value,
                          })
                        }
                        placeholder="sk-..."
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Custom Headers</Label>
                        <Button

                          variant="outline"
                          onClick={() => {
                            const newHeader = {
                              id: `header-${Date.now()}-${Math.random()}`,
                              name: '',
                              value: '',
                            };
                            const updatedHeaders = [...(settingsStore.embeddingModel?.customHeaders || []), newHeader];
                            settingsStore.setEmbeddingModel({
                              provider: settingsStore.embeddingModel?.provider || 'openai',
                              modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                              baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                              apiKey: settingsStore.embeddingModel?.apiKey || "",
                              customHeaders: updatedHeaders,
                            });
                          }}
                        >
                          Add Header
                        </Button>
                      </div>
                      
                      {(settingsStore.embeddingModel?.customHeaders || []).length > 0 && (
                        <div className="space-y-2 mt-3 p-3 bg-muted rounded-md">
                          <div className="text-xs font-medium text-muted-foreground mb-2 grid grid-cols-[1fr_40px] gap-2">
                            <div>Header Name / Value</div>
                            <div />
                          </div>
                          {settingsStore.embeddingModel?.customHeaders?.map((header, index) => (
                            <div key={header.id} className="space-y-2">
                              <Input
                                aria-label="Header name"
                                id={`emb-header-name-mobile-${header.id}`}
                                placeholder="e.g., X-Custom-Header"
                                value={header.name}
                                onChange={(e) => {
                                  const updated = settingsStore.embeddingModel?.customHeaders?.map(h =>
                                    h.id === header.id ? { ...h, name: e.target.value } : h
                                  ) || [];
                                  settingsStore.setEmbeddingModel({
                                    provider: settingsStore.embeddingModel?.provider || 'openai',
                                    modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                                    baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                                    apiKey: settingsStore.embeddingModel?.apiKey || "",
                                    customHeaders: updated,
                                  });
                                }}
                              />
                              <div className="flex gap-2 items-end">
                                <Input
                                  aria-label="Header value"
                                  id={`emb-header-value-mobile-${header.id}`}
                                  placeholder="header value"
                                  value={header.value}
                                  onChange={(e) => {
                                    const updated = settingsStore.embeddingModel?.customHeaders?.map(h =>
                                      h.id === header.id ? { ...h, value: e.target.value } : h
                                    ) || [];
                                    settingsStore.setEmbeddingModel({
                                      provider: settingsStore.embeddingModel?.provider || 'openai',
                                      modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                                      baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                                      apiKey: settingsStore.embeddingModel?.apiKey || "",
                                      customHeaders: updated,
                                    });
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Delete header"
                                  onClick={() => {
                                    const updated = settingsStore.embeddingModel?.customHeaders?.filter(h => h.id !== header.id) || [];
                                    settingsStore.setEmbeddingModel({
                                      provider: settingsStore.embeddingModel?.provider || 'openai',
                                      modelName: settingsStore.embeddingModel?.modelName || 'text-embedding-3-small',
                                      baseUrl: settingsStore.embeddingModel?.baseUrl || "",
                                      apiKey: settingsStore.embeddingModel?.apiKey || "",
                                      customHeaders: updated,
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prompts">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Prompts</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="category-recognition-prompt-mobile">Category Recognition Prompt</Label>
                    <Textarea
                      id="category-recognition-prompt-mobile"
                      value={settingsStore.categoryRecognitionPrompt}
                      onChange={(e) =>
                        settingsStore.setCategoryRecognitionPrompt(e.target.value)
                      }
                      placeholder="Enter the category prompt..."
                      className="min-h-30 max-h-[30vh] font-mono text-sm overflow-y-auto resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      This template uses Jinja2 syntax and automatically includes all your configured categories. 
                      Use {"{% for category in categories %}"} to iterate through them.
                    </p>
                  </div>
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
                  <div className="space-y-3 pb-4 border-b border-border">
                    <h4 className="text-sm font-semibold">Generic Enrichment Prompt</h4>
                    <Textarea
                      id="generic-enrichment-categories-mobile"
                      value={settingsStore.genericEnrichmentPrompt}
                      onChange={(e) =>
                        settingsStore.setGenericEnrichmentPrompt(e.target.value)
                      }
                      placeholder="Enter the generic prompt..."
                      className="min-h-20 max-h-[30vh] font-mono text-sm overflow-y-auto resize-none"
                    />
                    <p className="text-xs text-muted-foreground italic">
                      Applied to all categories as a base instruction
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Categories</h4>
                    <Button
                      onClick={handleAddNewCategory}

                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>

                  <Accordion type="multiple" className="space-y-2">
                    {editingCategories.map((category) => (
                      <AccordionItem key={category.id} value={category.id}>
                        <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium truncate text-sm">{category.name || "Unnamed Category"}</span>
                            <span className={cn(
                              "text-xs font-normal px-2 py-1 rounded whitespace-nowrap shrink-0",
                              category.noEnrichment 
                                ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100"
                                : "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100"
                            )}>
                              {category.noEnrichment ? "Off" : "On"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  role="button"
                                  aria-label="View details"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                                >
                                  <Eye className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">View</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  role="button"
                                  aria-label="Edit category"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCategory(category.id);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  role="button"
                                  aria-label="Delete category"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategoryWithConfirm(category.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-3 pb-3 border-b border-border">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Name</p>
                                <p className="text-sm font-medium">{category.name || "Unnamed Category"}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">AI Enrichment</p>
                                <p className="text-sm">{category.noEnrichment ? "Off" : "On"}</p>
                              </div>
                              {!category.noEnrichment && category.enrichmentPrompt && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">AI Enrichment Prompt</p>
                                  <p className="text-sm font-mono whitespace-pre-wrap">{category.enrichmentPrompt}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        categoryData={modalCategoryData}
        onUpdateCategory={handleUpdateCategory}
        onSave={handleModalSave}
        onCancel={handleModalCancel}
        isSaving={isSaving}
        isEditing={editingCategoryId ? !newCategoryIds.has(editingCategoryId) : false}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent style={{ zIndex: 60 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const cat = pendingDeleteId ? editingCategories.find(c => c.id === pendingDeleteId) : undefined;
                const name = cat?.name || "this category";
                return `Delete ${name}? This action cannot be undone.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOpen(false);
                setPendingDeleteId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingDeleteId) {
                  await handleDeleteCategory(pendingDeleteId);
                }
                setConfirmOpen(false);
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
    </TooltipProvider>
  );
}
