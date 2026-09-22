"use client";

import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Sparkles,
  Type,
} from "lucide-react";

export interface SlashCommandMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectAI?: () => void;
}

export function SlashCommandMenu({
  editor,
  isOpen,
  onClose,
  onSelectAI,
}: SlashCommandMenuProps) {
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !editor) return null;

  const items = [
    {
      title: "AI Copilot Assistant",
      subtitle: "Ask AI to generate, summarize, or rewrite",
      icon: <Sparkles className="w-4 h-4 text-pink-500" />,
      action: () => {
        if (onSelectAI) onSelectAI();
      },
    },
    {
      title: "Heading 1",
      subtitle: "Big section heading",
      icon: <Heading1 className="w-4 h-4 text-indigo-500" />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      subtitle: "Medium section heading",
      icon: <Heading2 className="w-4 h-4 text-indigo-500" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      subtitle: "Small section heading",
      icon: <Heading3 className="w-4 h-4 text-indigo-500" />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bulleted List",
      subtitle: "Create a simple bulleted list",
      icon: <List className="w-4 h-4 text-purple-500" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      subtitle: "Create a numbered list",
      icon: <ListOrdered className="w-4 h-4 text-purple-500" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Quote Block",
      subtitle: "Highlight a quote or callout",
      icon: <Quote className="w-4 h-4 text-emerald-500" />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Code Snippet",
      subtitle: "Insert block with monospace formatting",
      icon: <Code className="w-4 h-4 text-amber-500" />,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Divider",
      subtitle: "Visually separate sections with a line",
      icon: <Minus className="w-4 h-4 text-slate-400" />,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter blocks..."
          className="w-full text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="max-h-60 overflow-y-auto p-1 flex flex-col gap-0.5 mt-1">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {item.subtitle}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="p-4 text-center text-xs text-slate-400">
            No matching blocks found
          </div>
        )}
      </div>
    </div>
  );
}
