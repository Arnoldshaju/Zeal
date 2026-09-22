import React from "react";
import { cn } from "./button";

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isOnline?: boolean;
}

export function Avatar({
  name = "User",
  src,
  size = "md",
  className,
  isOnline,
}: AvatarProps) {
  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const dotSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
    xl: "h-3.5 w-3.5",
  };

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover border border-slate-200 dark:border-slate-800",
            sizes[size],
            className
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold flex items-center justify-center shadow-xs select-none",
            sizes[size],
            className
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900",
            dotSizes[size],
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          )}
        />
      )}
    </div>
  );
}
