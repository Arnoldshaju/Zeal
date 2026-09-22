"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Bell,
  ChevronDown,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  LogOut,
  Building2,
} from "lucide-react";
import { Workspace, logout } from "@/lib/api";
import { Avatar } from "./avatar";
import { Button } from "./button";

export interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: () => void;
  currentUser?: { username: string; email: string } | null;
}

export function Sidebar({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  currentUser,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? "w-18" : "w-64"
      }`}
    >
      {/* Brand Header & Collapse toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20 shrink-0">
            Z
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
              Zeal
            </span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 relative">
        {!isCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {activeWorkspace?.name || "Select Workspace"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Workspace
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {wsDropdownOpen && (
              <div className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Workspaces
                </div>
                <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws);
                        setWsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        activeWorkspace?.id === ws.id
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      onCreateWorkspace();
                      setWsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
            title={activeWorkspace?.name || "Workspace"}
          >
            <Building2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu
          </div>
        )}

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white dark:bg-indigo-600 shadow-sm shadow-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
              } ${isCollapsed ? "justify-center px-0" : ""}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom User Card & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={currentUser?.username || "User"} size="sm" />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser?.username || "User"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {currentUser?.email || ""}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
