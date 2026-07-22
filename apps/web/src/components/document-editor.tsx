"use client";

import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch, DocumentMember, DocumentRecord, getAccessToken, MemberRole, readError, User } from "@/lib/api";
import { CollaborationClient } from "@/lib/collaboration";

const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
type SaveStatus = "loading" | "saved" | "saving" | "error";

export function DocumentEditor({ documentId }: { documentId: string }) {
  const [title, setTitle] = useState("Untitled");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState("");
  const [members, setMembers] = useState<DocumentMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [presence, setPresence] = useState("Connecting…");
  const [sharingOpen, setSharingOpen] = useState(false);
  const loadedRef = useRef(false);
  const canEditRef = useRef(false);
  const titleRef = useRef(title);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<CollaborationClient | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: EMPTY_DOCUMENT,
    immediatelyRender: false,
    editorProps: { attributes: { class: "min-h-[60vh] outline-none" } },
    onUpdate: ({ editor: currentEditor }) => {
      if (!loadedRef.current || !canEditRef.current) return;
      const content = currentEditor.getJSON();
      setStatus("saving");
      clientRef.current?.updateDocument(content);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const response = await apiFetch(`/documents/${documentId}/`, {
          method: "PATCH", body: JSON.stringify({ title: titleRef.current, content }),
        });
        if (response.ok) { setStatus("saved"); setError(""); }
        else { setStatus("error"); setError(await readError(response)); }
      }, 750);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentEditor = editor;
    async function load() {
      const [documentResponse, userResponse] = await Promise.all([
        apiFetch(`/documents/${documentId}/`), apiFetch("/auth/me/"),
      ]);
      if (!documentResponse.ok) throw new Error(await readError(documentResponse));
      if (!userResponse.ok) throw new Error(await readError(userResponse));
      const document = (await documentResponse.json()) as DocumentRecord;
      const user = (await userResponse.json()) as User;
      const owner = document.owner === user.id;
      const role = document.members.find((member) => member.user === user.id)?.role;
      const editable = owner || role === "OWNER" || role === "EDITOR";
      setTitle(document.title); titleRef.current = document.title;
      setMembers(document.members); setIsOwner(owner); setCanEdit(editable);
      canEditRef.current = editable; currentEditor.setEditable(editable);
      currentEditor.commands.setContent(
        document.content?.type ? (document.content as JSONContent) : EMPTY_DOCUMENT,
        { emitUpdate: false },
      );
      loadedRef.current = true; setStatus("saved");

      const token = getAccessToken();
      if (!token) throw new Error("Your login expired. Sign in again.");
      const client = new CollaborationClient(documentId, token);
      client.subscribe(async (event) => {
        if (event.type === "document.update") {
          currentEditor.commands.setContent(event.update as JSONContent, { emitUpdate: false });
          setStatus("saved");
        } else if (event.type === "presence.update") {
          setPresence(`${event.username} ${event.action}`);
        } else if (event.code === "forbidden") {
          canEditRef.current = false; setCanEdit(false); currentEditor.setEditable(false);
          setError(event.message);
          const latest = await apiFetch(`/documents/${documentId}/`);
          if (latest.ok) {
            const data = (await latest.json()) as DocumentRecord;
            currentEditor.commands.setContent(data.content as JSONContent, { emitUpdate: false });
          }
        }
      });
      client.connect(); clientRef.current = client;
    }
    load().catch((caught) => { setStatus("error"); setError(caught instanceof Error ? caught.message : "Unable to open document."); });
    return () => {
      loadedRef.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      clientRef.current?.disconnect(); clientRef.current = null;
    };
  }, [documentId, editor]);

  function changeTitle(value: string) {
    setTitle(value); titleRef.current = value;
    if (!editor || !canEditRef.current) return;
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const response = await apiFetch(`/documents/${documentId}/`, {
        method: "PATCH", body: JSON.stringify({ title: value, content: editor.getJSON() }),
      });
      setStatus(response.ok ? "saved" : "error");
      if (response.ok) setError("");
      else setError(await readError(response));
    }, 750);
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await apiFetch(`/documents/${documentId}/members/`, {
      method: "POST", body: JSON.stringify(values),
    });
    if (!response.ok) { setError(await readError(response)); return; }
    const member = (await response.json()) as DocumentMember;
    setMembers((current) => [...current.filter((item) => item.user !== member.user), member]);
    form.reset();
  }

  async function changeRole(member: DocumentMember, role: MemberRole) {
    const response = await apiFetch(`/documents/${documentId}/members/${member.user}/`, {
      method: "PATCH", body: JSON.stringify({ role }),
    });
    if (!response.ok) { setError(await readError(response)); return; }
    const updated = (await response.json()) as DocumentMember;
    setMembers((current) => current.map((item) => item.user === updated.user ? updated : item));
  }

  return <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_19rem]">
    <section className="rounded-2xl bg-white p-6 text-black shadow-sm sm:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <input aria-label="Document title" value={title} onChange={(event) => changeTitle(event.target.value)} disabled={!canEdit} className="min-w-0 flex-1 bg-white text-2xl font-bold text-black outline-none disabled:text-slate-500" />
        <div className="text-right"><p className={`text-sm ${status === "error" ? "text-red-600" : "text-slate-500"}`}>{status === "loading" ? "Loading…" : status === "saving" ? "Saving…" : status === "error" ? "Save failed" : "Saved"}</p><p className="mt-1 text-xs text-slate-400">{presence}</p></div>
      </div>
      {!canEdit && status !== "loading" && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Viewer mode: you can read but cannot publish edits.</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div
        className={`min-h-[60vh] rounded-lg ${canEdit ? "cursor-text" : "cursor-default"}`}
        onClick={() => {
          if (canEdit) editor?.commands.focus();
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </section>
    <aside className="h-fit rounded-2xl bg-white p-5 text-black shadow-sm">
      <button onClick={() => setSharingOpen((open) => !open)} className="flex w-full items-center justify-between font-bold"><span>Collaborators</span><span>{members.length}</span></button>
      {(sharingOpen || isOwner) && <div className="mt-4 space-y-4">
        {members.map((member) => <div key={member.id} className="rounded-lg border border-slate-200 p-3 text-black"><p className="truncate font-medium">{member.username}</p>{isOwner && member.role !== "OWNER" ? <select aria-label={`Role for ${member.username}`} value={member.role} onChange={(event) => changeRole(member, event.target.value as MemberRole)} className="mt-2 w-full rounded border border-slate-300 bg-white p-1.5 text-sm text-black"><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select> : <p className="mt-1 text-xs text-slate-500">{member.role}</p>}</div>)}
        {isOwner && <form onSubmit={invite} className="space-y-2 border-t border-slate-200 pt-4"><p className="text-sm font-semibold text-black">Add a user</p><input name="username" required placeholder="Exact username" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400" /><select name="role" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black"><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select><button className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Add collaborator</button></form>}
      </div>}
    </aside>
  </div>;
}
