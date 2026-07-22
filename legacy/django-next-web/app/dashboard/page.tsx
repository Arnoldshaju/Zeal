"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearTokens, DocumentRecord, readError } from "@/lib/api";

type User = { id: number; username: string; email: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [userResponse, documentsResponse] = await Promise.all([apiFetch("/auth/me/"), apiFetch("/documents/")]);
      if (userResponse.status === 401 || documentsResponse.status === 401) { router.replace("/login"); return; }
      if (!userResponse.ok) throw new Error(await readError(userResponse));
      if (!documentsResponse.ok) throw new Error(await readError(documentsResponse));
      setUser((await userResponse.json()) as User);
      setDocuments((await documentsResponse.json()) as DocumentRecord[]);
    }
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load dashboard."))
      .finally(() => setLoading(false));
  }, [router]);

  async function createDocument() {
    const response = await apiFetch("/documents/", { method: "POST", body: JSON.stringify({
      title: "Untitled", content: { type: "doc", content: [{ type: "paragraph" }] },
    }) });
    if (!response.ok) { setError(await readError(response)); return; }
    const document = (await response.json()) as DocumentRecord;
    router.push(`/documents/${document.id}`);
  }
  function logout() { clearTokens(); router.push("/login"); }

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10"><div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold text-slate-900">Your documents</h1><p className="mt-1 text-slate-500">{user ? `Signed in as ${user.username}` : "Loading account…"}</p></div>
        <div className="flex gap-3"><button onClick={logout} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Log out</button><button onClick={createDocument} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">New document</button></div></header>
      {error && <p className="mb-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {loading ? <p className="text-slate-500">Loading documents…</p> : documents.length === 0 ?
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">No documents yet. Create your first one.</div> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) =>
          <Link key={document.id} href={`/documents/${document.id}`} className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"><h2 className="truncate font-semibold text-slate-900">{document.title}</h2><p className="mt-3 text-sm text-slate-500">Updated {new Date(document.updated_at).toLocaleString()}</p></Link>)}</div>}
    </div></main>
  );
}
