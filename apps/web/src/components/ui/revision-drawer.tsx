"use client";

import React, { useState, useEffect } from "react";
import { History, X, RotateCcw, Clock, Check, FileText } from "lucide-react";
import { diffWords } from "diff";
import { apiFetch, readError } from "@/lib/api";
import { Button } from "./button";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";

export type RevisionRecord = {
  id: string;
  document: string;
  version: number;
  title: string;
  content: Record<string, unknown>;
  author_username?: string;
  created_at: string;
};

export interface RevisionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentTitle: string;
  currentText: string;
  onRestoreRevision: (title: string, content: Record<string, unknown>) => void;
}

export function RevisionDrawer({
  isOpen,
  onClose,
  documentId,
  currentTitle,
  currentText,
  onRestoreRevision,
}: RevisionDrawerProps) {
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !documentId) return;

    async function fetchRevisions() {
      setLoading(true);
      setError("");
      try {
        const response = await apiFetch(`/documents/${documentId}/revisions/`);
        if (!response.ok) {
          // If revisions endpoint is not supported, gracefully show fallback state
          setRevisions([]);
          return;
        }
        const data = (await response.json()) as RevisionRecord[];
        setRevisions(Array.isArray(data) ? data : []);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load revisions.");
      } finally {
        setLoading(false);
      }
    }

    void fetchRevisions();
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const revisionText = selectedRevision
    ? JSON.stringify(selectedRevision.content, null, 2)
    : "";

  const diffParts = selectedRevision ? diffWords(revisionText, currentText) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl z-10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Revision History
              </h3>
              <p className="text-xs text-slate-400">
                Inspect past snapshots &amp; compare changes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : revisions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <Clock className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Current Version Active
              </p>
              <p>Revisions are automatically captured when documents are saved.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Past Snapshots
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {revisions.map((rev) => (
                    <button
                      key={rev.id}
                      onClick={() => setSelectedRevision(rev)}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        selectedRevision?.id === rev.id
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 font-semibold"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="indigo">v{rev.version}</Badge>
                        <span className="truncate">{rev.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(rev.created_at).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Diff Box */}
              {selectedRevision && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Diff Comparison (v{selectedRevision.version} vs Current)
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        onRestoreRevision(
                          selectedRevision.title,
                          selectedRevision.content
                        );
                        onClose();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore v{selectedRevision.version}</span>
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                    {diffParts.map((part, idx) => (
                      <span
                        key={idx}
                        className={
                          part.added
                            ? "bg-emerald-500/20 text-emerald-300 font-bold px-1 rounded-xs"
                            : part.removed
                            ? "bg-rose-500/20 text-rose-300 line-through px-1 rounded-xs"
                            : ""
                        }
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
