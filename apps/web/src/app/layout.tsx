import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "Zeal — Collaborative Document Workspace",
    template: "%s | Zeal",
  },
  description:
    "Zeal is a workspace-based collaborative document editor built for high-performance teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider defaultTheme="system" storageKey="zeal-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
