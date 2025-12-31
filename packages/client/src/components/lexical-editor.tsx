"use client"

import { useRef } from "react"

interface LexicalEditorProps {
  content: string
  onChange: (content: string) => void
}

export function LexicalEditor({ content, onChange }: LexicalEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="h-full">
      <textarea
        ref={editorRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start writing your note..."
        className="w-full h-full min-h-[400px] bg-transparent border-none outline-none resize-none text-foreground text-sm leading-relaxed placeholder:text-muted-foreground p-0"
      />
    </div>
  )
}
