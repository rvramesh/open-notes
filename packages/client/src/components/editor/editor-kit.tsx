"use client";

import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { AIKit } from "@/components/editor/ai-kit";
import { AlignKit } from "@/components/editor/align-kit";
import { AutoformatKit } from "@/components/editor/autoformat-kit";
import { BasicBlocksKit } from "@/components/editor/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/basic-marks-kit";
import { BlockMenuKit } from "@/components/editor/block-menu-kit";
import { BlockPlaceholderKit } from "@/components/editor/block-placeholder-kit";
import { CalloutKit } from "@/components/editor/callout-kit";
import { CodeBlockKit } from "@/components/editor/code-block-kit";
import { ColumnKit } from "@/components/editor/column-kit";
import { CopilotKit } from "@/components/editor/copilot-kit";
import { CursorOverlayKit } from "@/components/editor/cursor-overlay-kit";
import { DateKit } from "@/components/editor/date-kit";
import { DndKit } from "@/components/editor/dnd-kit";
import { DocxKit } from "@/components/editor/docx-kit";
import { EmojiKit } from "@/components/editor/emoji-kit";
import { ExitBreakKit } from "@/components/editor/exit-break-kit";
import { FixedToolbarKit } from "@/components/editor/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/editor/floating-toolbar-kit";
import { FontKit } from "@/components/editor/font-kit";
import { LineHeightKit } from "@/components/editor/line-height-kit";
import { LinkKit } from "@/components/editor/link-kit";
import { ListKit } from "@/components/editor/list-kit";
import { MarkdownKit } from "@/components/editor/markdown-kit";
import { MathKit } from "@/components/editor/math-kit";
import { MediaKit } from "@/components/editor/media-kit";
import { MentionKit } from "@/components/editor/mention-kit";
import { SlashKit } from "@/components/editor/slash-kit";
import { TableKit } from "@/components/editor/table-kit";
import { TocKit } from "@/components/editor/toc-kit";
import { ToggleKit } from "@/components/editor/toggle-kit";

export const EditorKit = [
  ...AIKit,

  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
