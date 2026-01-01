"use client";

import { useRef } from "react";
import { PlateEditor } from "./plate-editor";

interface LexicalEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function LexicalEditor({ content, onChange }: LexicalEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="h-full">
      <PlateEditor />
    </div>
  );
}
