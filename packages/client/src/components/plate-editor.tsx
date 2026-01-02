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
}

export const PlateEditor = React.forwardRef<
  HTMLDivElement,
  PlateEditorProps
>(function PlateEditorComponent({ content, onChange, noteId, onBlur }, ref) {
  // Parse initial content or use default
  const initialValue = content ? parseContent(content) : getDefaultContent();

  // Use noteId as key to force remount when switching notes
  // This ensures the editor resets with the new note's content
  const editorKey = React.useMemo(() => noteId || "default", [noteId]);

  // Add editorKey to the editor creation so it recreates when key changes
  const editor = usePlateEditor({
    id: editorKey, // Use unique ID to force editor recreation
    plugins: EditorKit,
    value: initialValue,
  });

  // Track the last serialized value to avoid duplicate onChange calls
  const lastValueRef = React.useRef<string>(JSON.stringify(initialValue));
  const isInitializedRef = React.useRef<boolean>(false);

  // Effect: Listen for editor value changes and notify parent
  React.useEffect(() => {
    if (!editor) return;

    // Debounce timer for onChange callback
    let debounceTimer: NodeJS.Timeout;

    // Create a listener function for value changes
    const checkForChanges = () => {
      debounceTimer = setTimeout(() => {
        const currentValue = JSON.stringify(editor.children);
        
        // Skip the first comparison to avoid firing onChange during initialization
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          lastValueRef.current = currentValue;
          return;
        }
        
        if (currentValue !== lastValueRef.current) {
          lastValueRef.current = currentValue;
          onChange(currentValue);
        }
      }, 300);
    };

    // Use MutationObserver or polling to detect changes in the editor DOM
    // For now, we'll use a polling approach with reasonable frequency
    const pollInterval = setInterval(checkForChanges, 500);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(debounceTimer);
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
