"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearTokens, DocumentRecord, readError, User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([apiFetch("/auth/me/"), apiFetch("/documents/")]).then(async ([me, docs]) => {
      if (me.status === 401 || docs.status === 401) { router.replace("/login"); return; }
      if (!me.ok) throw new Error(await readError(me));
      if (!docs.ok) throw new Error(await readError(docs));
      setUser((await me.json()) as User); setDocuments((await docs.json()) as DocumentRecord[]);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load documents."))
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
  return <main className="min-h-screen bg-slate-100 p-6 sm:p-10"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-slate-500">Zeal</p><h1 className="mt-1 text-3xl font-bold">Documents</h1><p className="mt-1 text-slate-500">{user ? `Signed in as ${user.username}` : "Loading account…"}</p></div><div className="flex gap-3"><button onClick={logout} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium">Log out</button><button onClick={createDocument} className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white">New document</button></div></header>
    {error && <p className="mb-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {loading ? <p>Loading…</p> : documents.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">No documents yet.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{documents.map((document) => <Link key={document.id} href={`/documents/${document.id}`} className="rounded-xl bg-white p-5 shadow-sm hover:shadow"><h2 className="truncate font-semibold">{document.title}</h2><p className="mt-2 text-sm text-slate-500">Owner: {document.owner_username}</p><p className="mt-1 text-xs text-slate-400">Updated {new Date(document.updated_at).toLocaleString()}</p></Link>)}</div>}
  </div></main>;
}
