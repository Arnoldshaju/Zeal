"use client";

import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, DocumentRecord, readError } from "@/lib/api";

const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
type SaveStatus = "loading" | "saved" | "saving" | "error";

export function DocumentEditor({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("Untitled");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState("");
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);

  async function save(content: JSONContent, nextTitle = titleRef.current) {
    setStatus("saving");
    const response = await apiFetch(`/documents/${documentId}/`, { method: "PATCH", body: JSON.stringify({ title: nextTitle, content }) });
    if (!response.ok) { setStatus("error"); setError(await readError(response)); return; }
    setError(""); setStatus("saved");
  }

  const editor = useEditor({
    extensions: [StarterKit], content: EMPTY_DOCUMENT, immediatelyRender: false,
    editorProps: { attributes: { class: "min-h-[65vh] outline-none" } },
    onUpdate: ({ editor: currentEditor }) => {
      if (!loaded.current) return;
      setStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(currentEditor.getJSON()), 750);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentEditor = editor;
    async function loadDocument() {
      const response = await apiFetch(`/documents/${documentId}/`);
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(await readError(response));
      const document = (await response.json()) as DocumentRecord;
      setTitle(document.title); titleRef.current = document.title;
      const content = document.content?.type ? (document.content as JSONContent) : EMPTY_DOCUMENT;
      currentEditor.commands.setContent(content);
      loaded.current = true; setStatus("saved");
    }
    loadDocument().catch((caught) => { setStatus("error"); setError(caught instanceof Error ? caught.message : "Unable to load document."); });
    return () => { loaded.current = false; if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [documentId, editor, router]);

  function changeTitle(nextTitle: string) {
    setTitle(nextTitle); titleRef.current = nextTitle;
    if (!editor || !loaded.current) return;
    setStatus("saving"); if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(editor.getJSON(), nextTitle), 750);
  }

  return <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow sm:p-10">
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
      <input value={title} onChange={(event) => changeTitle(event.target.value)} disabled={status === "loading"} aria-label="Document title" className="min-w-0 flex-1 text-2xl font-semibold text-slate-900 outline-none" />
      <span className={`shrink-0 text-sm ${status === "error" ? "text-red-600" : "text-slate-500"}`} aria-live="polite">{status === "loading" ? "Loading…" : status === "saving" ? "Saving…" : status === "error" ? "Save failed" : "Saved"}</span>
    </div>
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <EditorContent editor={editor} />
  </div>;
}
