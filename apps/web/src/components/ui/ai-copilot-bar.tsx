"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Wand2,
  FileText,
  CheckCircle,
  Languages,
  X,
  ArrowRight,
  Loader2,
  ListCheck,
  Check,
  CornerDownLeft,
} from "lucide-react";
import { AITaskType, processAITask } from "@/lib/ai-assistant";
import { Button } from "./button";

export interface AICopilotBarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onApplyResult: (resultText: string, mode: "replace" | "insert_below") => void;
}

export function AICopilotBar({
  isOpen,
  onClose,
  selectedText,
  onApplyResult,
}: AICopilotBarProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  if (!isOpen) return null;

  const handleRunTask = async (task: AITaskType) => {
    setLoading(true);
    try {
      const response = await processAITask(task, selectedText || prompt);
      setOutput(response.result);
    } catch {
      setOutput("AI Assistant could not complete the request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await processAITask("improve_tone", `${prompt}: ${selectedText}`);
      setOutput(response.result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 dark:border-indigo-500/40 shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              Zeal AI Copilot
            </h4>
            <p className="text-[11px] text-slate-400">
              {selectedText
                ? `Active Selection (${selectedText.length} chars)`
                : "Ask AI to generate, summarize, or extract items"}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          onClick={() => handleRunTask("summarize")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Summarize</span>
        </button>

        <button
          onClick={() => handleRunTask("improve_tone")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Improve Tone</span>
        </button>

        <button
          onClick={() => handleRunTask("fix_grammar")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Fix Grammar</span>
        </button>

        <button
          onClick={() => handleRunTask("action_items")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1"
        >
          <ListCheck className="w-3.5 h-3.5" />
          <span>Extract TODOs</span>
        </button>

        <button
          onClick={() => handleRunTask("generate_prd")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/60 transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate PRD</span>
        </button>

        <button
          onClick={() => handleRunTask("generate_meeting")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Meeting Notes</span>
        </button>
      </div>

      {/* Freeform Prompt Bar */}
      <form onSubmit={handleCustomPrompt} className="relative flex items-center">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI to write, rewrite, or transform..."
          className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="absolute right-2 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Loading Shimmer */}
      {loading && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3 text-xs text-indigo-600 dark:text-indigo-400">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Generating AI response...</span>
        </div>
      )}

      {/* Output Result Card */}
      {output && !loading && (
        <div className="space-y-3 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
            {output}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplyResult(output, "insert_below")}
            >
              <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
              <span>Insert Below</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onApplyResult(output, "replace")}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Replace Selection</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
