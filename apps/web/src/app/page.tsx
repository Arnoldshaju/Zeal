import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  FileText,
  Users,
  FolderKanban,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Globe,
  Code2,
  Layers,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const features = [
  {
    icon: <Layers className="w-5 h-5 text-indigo-500" />,
    title: "Clean Workspace Hierarchy",
    description:
      "Organizations > Workspaces > Projects > Tasks & Documents. A clean, scalable structure for teams of any size.",
  },
  {
    icon: <Globe className="w-5 h-5 text-purple-500" />,
    title: "Real-Time WebSocket Sync",
    description:
      "Collaborative Tiptap rich-text document editing powered by Django Channels & Redis pub/sub presence updates.",
  },
  {
    icon: <Lock className="w-5 h-5 text-emerald-500" />,
    title: "Role-Based Access Control",
    description:
      "Granular roles (Owner, Admin, Member, Editor, Viewer) strictly enforced by backend QuerySets & permissions.",
  },
  {
    icon: <Code2 className="w-5 h-5 text-blue-500" />,
    title: "Developer-First REST API",
    description:
      "Full OpenAPI / Swagger specification at /api/docs/ with JWT rotation, blacklisting, and signed webhooks.",
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    title: "Celery Task Queue & Reminders",
    description:
      "Background processing for email notifications, scheduled due-date reminders, and Redis cache invalidation.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-rose-500" />,
    title: "Idempotent Operations",
    description:
      "Idempotency-Key headers prevent duplicate document mutations and keep network retries 100% safe.",
  },
];

const permissionMatrix = [
  { role: "Workspace Owner / Admin", read: true, create: true, modify: true, manage: true },
  { role: "Project Manager", read: true, create: true, modify: true, manage: true },
  { role: "Contributor / Editor", read: true, create: true, modify: true, manage: false },
  { role: "Viewer", read: true, create: false, modify: false, manage: false },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#090d16]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
              Z
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
              Zeal
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Features</a>
            <a href="#hierarchy" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Architecture</a>
            <a href="#permissions" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Permissions</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-32">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Notion + Linear + Real-Time WebSocket Docs</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-slate-50">
            The collaborative workspace for{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
              modern engineering teams.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Zeal combines workspace-based organization, Tiptap rich-text document editing, live presence sync, and task workflows into one fast platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all text-center"
            >
              Sign In to Demo
            </Link>
          </div>

          {/* Interactive UI Card Preview */}
          <div className="pt-12 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 sm:p-6 shadow-2xl backdrop-blur-md text-left space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs font-medium text-slate-400">Zeal Workspace / Project Engineering</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>WebSocket Connected</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>DOCUMENT EDITOR</span>
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Product Spec v2.4</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tiptap rich text with slash commands and autosave.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>TASK KANBAN</span>
                    <FolderKanban className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sprint 14 Backlog</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Backlog, In Progress, Done status columns.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>TEAM COLLABORATION</span>
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live Presence</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active cursors and real-time document typing.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Platform Features
            </h2>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              Everything your team needs to write and deliver.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 hover:border-indigo-500/50 transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Permissions Matrix */}
      <section id="permissions" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Security &amp; Permissions
            </h2>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Enforced at the Django backend level.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                  <th className="p-4">Role</th>
                  <th className="p-4 text-center">Read Documents</th>
                  <th className="p-4 text-center">Create Content</th>
                  <th className="p-4 text-center">Modify Content</th>
                  <th className="p-4 text-center">Manage Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {permissionMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{row.role}</td>
                    <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                    <td className="p-4 text-center">
                      {row.create ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {row.modify ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      {row.manage ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to streamline your collaborative workspace?
          </h2>
          <p className="text-indigo-200/80 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Create your account today and experience real-time document editing backed by Django REST &amp; Channels.
          </p>
          <div className="pt-2 flex justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-white text-indigo-950 font-bold text-sm shadow-xl hover:bg-indigo-50 transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-8 text-xs text-slate-500 dark:text-slate-400 text-center">
        <p>&copy; 2026 Zeal. All rights reserved. Built with Next.js &amp; Django REST API.</p>
      </footer>
    </div>
  );
}