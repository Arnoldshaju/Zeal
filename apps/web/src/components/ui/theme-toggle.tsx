"use client";

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 ${className}`}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        title="Light Mode"
        className={`p-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 ${
          theme === "light"
            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        title="Dark Mode"
        className={`p-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 ${
          theme === "dark"
            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        title="System Preference"
        className={`p-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1 ${
          theme === "system"
            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
