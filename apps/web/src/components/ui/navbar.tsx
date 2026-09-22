"use client";

import React from "react";
import Link from "next/link";
import { Search, Bell, Plus, User, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";
import { Dropdown } from "./dropdown";
import { Button } from "./button";
import { logout } from "@/lib/api";

export interface NavbarProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  onOpenSearch?: () => void;
  onNewDocument?: () => void;
  unreadNotificationsCount?: number;
  user?: { username: string; email: string } | null;
}

export function Navbar({
  title = "Dashboard",
  breadcrumbs,
  onOpenSearch,
  onNewDocument,
  unreadNotificationsCount = 2,
  user,
}: NavbarProps) {
  const userMenuItems = [
    {
      label: `Signed in as @${user?.username || "user"}`,
      onClick: () => {},
      icon: <User className="w-3.5 h-3.5" />,
    },
    {
      label: "Logout",
      onClick: logout,
      icon: <LogOut className="w-3.5 h-3.5" />,
      danger: true,
    },
  ];

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between gap-4">
      {/* Breadcrumbs or Page Title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right Navbar Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Cmd+K Search trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span>Search documents or tasks...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search icon */}
        <button
          onClick={onOpenSearch}
          className="sm:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* New document button */}
        {onNewDocument && (
          <Button onClick={onNewDocument} size="sm" className="hidden sm:flex">
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </Button>
        )}

        {/* Notification Bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
          )}
        </Link>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar menu */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 focus:outline-none">
              <Avatar name={user?.username || "User"} size="sm" />
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}
