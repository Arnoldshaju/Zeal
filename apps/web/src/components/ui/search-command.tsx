"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderKanban, ArrowRight, X } from "lucide-react";
import { DocumentRecord } from "@/lib/api";

export interface SearchCommandProps {
  isOpen: boolean;
  onClose: () => void;
  documents?: DocumentRecord[];
}

export function SearchCommand({
  isOpen,
  onClose,
  documents = [],
}: SearchCommandProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open handled by parent or state
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, projects, or commands..."
            className="w-full text-base bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredDocs.length > 0 ? (
            <div>
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Documents
              </div>
              {filteredDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    router.push(`/documents/${doc.id}`);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left group transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Updated {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all shrink-0" />
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="p-6 text-xs text-slate-400 text-center">
              Type a document title to quickly open it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
