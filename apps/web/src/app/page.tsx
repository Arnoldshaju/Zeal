import Link from "next/link";

const resourceHierarchy = [
  { label: "Workspace", desc: "Organization container", icon: "◈" },
  { label: "Team", desc: "Group with memberships", icon: "◉" },
  { label: "Project", desc: "Tasks, activity, stats", icon: "◇" },
  { label: "Task", desc: "Comments, attachments, notifications", icon: "▣" },
];

const features = [
  {
    number: "01",
    title: "Workspaces & Teams",
    description:
      "Treat each Workspace as an organization. Teams and projects live inside, while tasks live inside projects — a clean hierarchy for any scale.",
  },
  {
    number: "02",
    title: "Full-Stack REST API",
    description:
      "CRUD endpoints for teams, projects, tasks, comments, attachments, and notifications. Filter, search, and order every resource.",
  },
  {
    number: "03",
    title: "Role-Based Access",
    description:
      "Owner/admin, project manager, contributor, and viewer roles. Permissions enforced at the backend — not just UI hiding.",
  },
  {
    number: "04",
    title: "Activity & Notifications",
    description:
      "Track every change in the activity log. Get notified for assignments, comments, and due dates. Scheduled reminders keep nothing missed.",
  },
  {
    number: "05",
    title: "Smart Caching",
    description:
      "Project stats are Redis-cached for 60 seconds. Task mutations invalidate the cache automatically — fast reads, always fresh.",
  },
  {
    number: "06",
    title: "Developer-First",
    description:
      "JWT authentication, OpenAPI/Swagger docs, Celery background jobs, PostgreSQL with row locking, and full test coverage.",
  },
];

const endpoints = [
  { group: "Teams", paths: ["GET/POST /api/v1/teams/", "GET/PATCH/DELETE /api/v1/teams/{id}/", "GET/POST /api/v1/teams/{id}/members/"] },
  { group: "Projects", paths: ["GET/POST /api/v1/projects/", "GET/PATCH/DELETE /api/v1/projects/{id}/", "GET /api/v1/projects/{id}/activity/", "GET /api/v1/projects/{id}/stats/"] },
  { group: "Tasks", paths: ["GET/POST /api/v1/tasks/", "GET/PATCH/DELETE /api/v1/tasks/{id}/", "GET/POST /api/v1/tasks/{id}/comments/", "GET/POST /api/v1/tasks/{id}/attachments/"] },
  { group: "Notifications", paths: ["GET /api/v1/notifications/", "POST /api/v1/notifications/{id}/read/", "POST /api/v1/notifications/read-all/"] },
];

const permissionMatrix = [
  { role: "Workspace owner/admin", read: true, create: true, modify: true, manage: true },
  { role: "Project manager", read: true, create: true, modify: true, manage: true },
  { role: "Contributor", read: true, create: true, modify: true, manage: false },
  { role: "Viewer", read: true, create: false, modify: false, manage: false },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0d0f13] text-white">
      <header className="relative z-20 border-b border-white/5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <span className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Zeal</span>
          </span>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#hierarchy" className="transition-colors hover:text-white">Hierarchy</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#api" className="transition-colors hover:text-white">API</a>
            <a href="#permissions" className="transition-colors hover:text-white">Permissions</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:text-white sm:px-4">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:px-5">
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative">
        <div aria-hidden="true" className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28 lg:px-12 lg:pt-32">
          <p className="mx-auto mb-6 w-fit rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm font-medium text-indigo-300">
            Workspace-based project management
          </p>
          <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Organize work,
            <span className="block bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
              from workspace to task.
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
            Zeal treats every Workspace as an organization. Teams, projects,
            tasks, and notifications all live in a clean hierarchy — with a
            full REST API, real-time activity, and role-based access.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#api" className="w-full rounded-lg border border-white/10 bg-white/5 px-7 py-3.5 font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10 sm:w-auto">
              Explore API
            </a>
            <Link href="/register" className="w-full rounded-lg bg-indigo-500 px-7 py-3.5 font-semibold text-white transition hover:bg-indigo-400 sm:w-auto text-center">
              Get started free
            </Link>
          </div>
        </div>
      </section>

      <section id="hierarchy" className="border-y border-white/5 bg-[#111318] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">Resource hierarchy</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Everything in its place.
            </h2>
            <p className="mt-5 leading-7 text-zinc-400">
              A clean tree from organization down to individual tasks — with
              comments, attachments, and notifications attached to every level.
            </p>
          </div>
          <div className="mt-14 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f13] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
              {resourceHierarchy.map((item, i) => (
                <div key={item.label} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-indigo-400">{item.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{item.label}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-indigo-500/10 px-4 py-3 text-sm text-indigo-300">
              <code className="font-mono">All endpoints require JWT: Authorization: Bearer ACCESS_TOKEN</code>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">Features</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Built for structured teams.
            </h2>
            <p className="mt-5 leading-7 text-zinc-400">
              From workspace creation to task-level notifications — every piece
              is designed to keep your team aligned and productive.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.05]"
              >
                <span className="text-sm font-semibold text-indigo-400">{feature.number}</span>
                <h3 className="mt-8 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 max-w-lg leading-7 text-zinc-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="api" className="border-y border-white/5 bg-[#111318] py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">API endpoints</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Every resource, covered.
            </h2>
            <p className="mt-5 leading-7 text-zinc-400">
              Full CRUD for teams, projects, tasks, comments, attachments,
              and notifications — with filtering, search, and ordering on every list.
            </p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {endpoints.map((group) => (
              <div key={group.group} className="rounded-2xl border border-white/10 bg-[#0d0f13] p-6">
                <h3 className="text-lg font-semibold text-indigo-400">{group.group}</h3>
                <div className="mt-4 flex flex-col gap-2">
                  {group.paths.map((path) => (
                    <code key={path} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-mono text-zinc-300">
                      {path}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/10 p-6">
            <p className="text-sm text-zinc-300">
              <strong className="text-white">Interactive docs:</strong> Swagger UI at{" "}
              <code className="text-indigo-400">http://localhost:8000/api/docs/</code> — paste your JWT token in the Authorize dialog to test live.
            </p>
          </div>
        </div>
      </section>

      <section id="permissions" className="py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">Permission matrix</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Access is enforced, not hidden.
            </h2>
            <p className="mt-5 leading-7 text-zinc-400">
              Four roles across four permission levels. Backend QuerySets and
              object permissions enforce every decision — hiding a button is never authorization.
            </p>
          </div>
          <div className="mt-14 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f13] shadow-2xl shadow-black/40">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.03]">
                  <th className="px-6 py-4 font-semibold text-zinc-300">Role</th>
                  <th className="px-6 py-4 text-center font-semibold text-zinc-300">Read</th>
                  <th className="px-6 py-4 text-center font-semibold text-zinc-300">Create tasks</th>
                  <th className="px-6 py-4 text-center font-semibold text-zinc-300">Modify tasks</th>
                  <th className="px-6 py-4 text-center font-semibold text-zinc-300">Manage project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {permissionMatrix.map((row) => (
                  <tr key={row.role} className="transition hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-zinc-200">{row.role}</td>
                    {['read', 'create', 'modify', 'manage'].map((perm) => (
                      <td key={perm} className="px-6 py-4 text-center">
                        {row[perm as keyof typeof row] ? (
                          <span className="text-indigo-400">✓</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">How it works</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Start managing your team in minutes.
            </h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { number: "1", title: "Create a Workspace", description: "Register and set up your organization. Invite teams and define roles." },
              { number: "2", title: "Add Projects & Tasks", description: "Create projects inside workspaces, tasks inside projects. Assign priorities, statuses, and due dates." },
              { number: "3", title: "Collaborate & Track", description: "Use comments, attachments, activity logs, and notifications to keep everything moving." },
            ].map((step) => (
              <article key={step.number} className="relative rounded-2xl border border-white/10 bg-[#13151b] p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 font-bold">{step.number}</span>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-7 text-zinc-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 via-[#151722] to-violet-500/10 px-7 py-14 text-center sm:px-12 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Ready to get started?</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
              Your workspace, your team, your workflow.
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-zinc-300">
              Sign up today and start organizing projects, tasks, and notifications
              in a workspace designed for real collaboration.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/register" className="rounded-lg bg-indigo-500 px-7 py-3.5 font-semibold text-white transition hover:bg-indigo-400">
                Create an account
              </Link>
              <Link href="/login" className="rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-zinc-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <p>© 2026 Zeal. Workspace-based project management</p>
          <div className="flex gap-6">
            <a href="#features" className="transition hover:text-zinc-300">Features</a>
            <a href="#api" className="transition hover:text-zinc-300">API Docs</a>
            <Link href="/login" className="transition hover:text-zinc-300">Sign in</Link>
            <Link href="/register" className="transition hover:text-zinc-300">Register</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}