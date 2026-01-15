"use client";

import React from "react";
import { normalizeNodeId, type Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";

import { EditorKit } from "@/components/editor/editor-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";

interface PlateEditorProps {
  content: string;
  onChange: (content: string) => void;
  noteId?: string | null; // Add noteId to force remount when switching notes
  onBlur?: () => void; // Save immediately on blur
  onEditorReady?: (editor: any) => void; // Callback when editor is ready
}

export const PlateEditor = React.forwardRef<
  HTMLDivElement,
  PlateEditorProps
>(function PlateEditorComponent({ content, onChange, noteId, onBlur, onEditorReady }, ref) {
  // Parse initial content or use default
  const initialValue = content ? parseContent(content) : getDefaultContent();

  // Use noteId as key to force remount when switching notes
  // This ensures the editor resets with the new note's content
  const editorKey = React.useMemo(() => noteId || "default", [noteId]);

  // Track initialization to skip first onChange call
  const isInitializedRef = React.useRef<boolean>(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = React.useRef<string>(JSON.stringify(initialValue));

  // Reset initialization flag when noteId changes
  React.useEffect(() => {
    isInitializedRef.current = false;
    lastValueRef.current = JSON.stringify(initialValue);
  }, [noteId, initialValue]);

  // Add editorKey to the editor creation so it recreates when key changes
  const editor = usePlateEditor({
    id: editorKey, // Use unique ID to force editor recreation
    plugins: EditorKit,
    value: initialValue,
  });

  // Notify parent when editor is ready
  React.useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Listen for editor changes using polling (more compatible with Plate.js)
  React.useEffect(() => {
    if (!editor) return;

    const checkInterval = setInterval(() => {
      const currentValue = JSON.stringify(editor.children);
      
      // Skip the first check which happens on mount
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        lastValueRef.current = currentValue;
        return;
      }

      // Only trigger onChange if value actually changed
      if (currentValue !== lastValueRef.current) {
        lastValueRef.current = currentValue;
        
        // Clear existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Debounce onChange calls to avoid excessive updates
        debounceTimerRef.current = setTimeout(() => {
          onChange(currentValue);
        }, 300);
      }
    }, 200); // Check more frequently (200ms instead of 500ms)

    return () => {
      clearInterval(checkInterval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, onChange]);

  return (
    <div ref={ref} key={editorKey} className="h-full" onBlur={onBlur}>
      <Plate editor={editor}>
        <EditorContainer variant={"demo"} className="flex-row">
          <Editor variant="ai" />
        </EditorContainer>

        {/* <SettingsDialog /> */}
      </Plate>
    </div>
  );
});

/**
 * Parse string content into normalized Plate.js value format.
 * Falls back to default content if parsing fails.
 */
function parseContent(content: string): Value {
  try {
    const parsed = JSON.parse(content);
    return normalizeNodeId(parsed);
  } catch {
    return getDefaultContent();
  }
}

/**
 * Default content for the editor when no content is provided.
 * Abstracted here to keep all Plate.js-specific logic in one place.
 */
function getDefaultContent(): Value {
  return normalizeNodeId([]);
}
