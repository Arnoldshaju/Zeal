"use client";

import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Users,
  Check,
  Loader2,
  Share2,
  Wifi,
  WifiOff,
  UserPlus,
  Shield,
} from "lucide-react";
import {
  apiFetch,
  DocumentMember,
  DocumentRecord,
  getAccessToken,
  MemberRole,
  readError,
  User,
} from "@/lib/api";
import { CollaborationClient } from "@/lib/collaboration";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type SaveStatus = "loading" | "saved" | "saving" | "error";

export function DocumentEditor({ documentId }: { documentId: string }) {
  const [title, setTitle] = useState("Untitled Document");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState("");
  const [members, setMembers] = useState<DocumentMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [presence, setPresence] = useState("Connecting...");
  const [sharingOpen, setSharingOpen] = useState(false);

  const loadedRef = useRef(false);
  const canEditRef = useRef(false);
  const titleRef = useRef(title);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<CollaborationClient | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Press '/' for commands or start typing...",
      }),
    ],
    content: EMPTY_DOCUMENT,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap min-h-[550px] outline-none text-slate-900 dark:text-slate-100",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!loadedRef.current || !canEditRef.current) return;
      const content = currentEditor.getJSON();
      setStatus("saving");
      clientRef.current?.updateDocument(content);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const response = await apiFetch(`/documents/${documentId}/`, {
          method: "PATCH",
          body: JSON.stringify({ title: titleRef.current, content }),
        });
        if (response.ok) {
          setStatus("saved");
          setError("");
        } else {
          setStatus("error");
          setError(await readError(response));
        }
      }, 750);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentEditor = editor;

    async function load() {
      const [documentResponse, userResponse] = await Promise.all([
        apiFetch(`/documents/${documentId}/`),
        apiFetch("/auth/me/"),
      ]);
      if (!documentResponse.ok) throw new Error(await readError(documentResponse));
      if (!userResponse.ok) throw new Error(await readError(userResponse));

      const document = (await documentResponse.json()) as DocumentRecord;
      const user = (await userResponse.json()) as User;

      const owner = document.owner === user.id;
      const role = document.members.find((m) => m.user === user.id)?.role;
      const editable = owner || role === "OWNER" || role === "EDITOR";

      setTitle(document.title);
      titleRef.current = document.title;
      setMembers(document.members);
      setIsOwner(owner);
      setCanEdit(editable);
      canEditRef.current = editable;
      currentEditor.setEditable(editable);

      currentEditor.commands.setContent(
        document.content?.type ? (document.content as JSONContent) : EMPTY_DOCUMENT,
        { emitUpdate: false }
      );
      loadedRef.current = true;
      setStatus("saved");

      const token = getAccessToken();
      if (!token) throw new Error("Your login expired. Sign in again.");

      const client = new CollaborationClient(documentId, token);
      client.subscribe(async (event) => {
        if (event.type === "document.update") {
          currentEditor.commands.setContent(event.update as JSONContent, {
            emitUpdate: false,
          });
          setStatus("saved");
        } else if (event.type === "presence.update") {
          setPresence(`${event.username} ${event.action}`);
        } else if (event.code === "forbidden") {
          canEditRef.current = false;
          setCanEdit(false);
          currentEditor.setEditable(false);
          setError(event.message);

          const latest = await apiFetch(`/documents/${documentId}/`);
          if (latest.ok) {
            const data = (await latest.json()) as DocumentRecord;
            currentEditor.commands.setContent(data.content as JSONContent, {
              emitUpdate: false,
            });
          }
        }
      });
      client.connect();
      clientRef.current = client;
    }

    load().catch((caught) => {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Unable to open document.");
    });

    return () => {
      loadedRef.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [documentId, editor]);

  function changeTitle(value: string) {
    setTitle(value);
    titleRef.current = value;
    if (!editor || !canEditRef.current) return;
    setStatus("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const response = await apiFetch(`/documents/${documentId}/`, {
        method: "PATCH",
        body: JSON.stringify({ title: value, content: editor.getJSON() }),
      });
      setStatus(response.ok ? "saved" : "error");
      if (response.ok) setError("");
      else setError(await readError(response));
    }, 750);
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await apiFetch(`/documents/${documentId}/members/`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const member = (await response.json()) as DocumentMember;
    setMembers((current) => [
      ...current.filter((item) => item.user !== member.user),
      member,
    ]);
    form.reset();
  }

  async function changeRole(member: DocumentMember, role: MemberRole) {
    const response = await apiFetch(
      `/documents/${documentId}/members/${member.user}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }
    );
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const updated = (await response.json()) as DocumentMember;
    setMembers((current) =>
      current.map((item) => (item.user === updated.user ? updated : item))
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 items-start">
      {/* Editor Main Canvas */}
      <Card className="p-6 sm:p-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
        {/* Editor Sub-Header / Status Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
          <input
            aria-label="Document title"
            value={title}
            onChange={(e) => changeTitle(e.target.value)}
            disabled={!canEdit}
            placeholder="Document Title..."
            className="w-full text-2xl sm:text-3xl font-extrabold tracking-tight bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none disabled:text-slate-400"
          />

          <div className="flex items-center gap-3 shrink-0">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {status === "saving" && (
                <span className="flex items-center gap-1.5 text-indigo-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
              {status === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </span>
              )}
              {status === "error" && (
                <span className="text-rose-500 font-semibold">Save failed</span>
              )}
            </div>

            {/* WebSocket Presence */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{presence}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSharingOpen(!sharingOpen)}
              className="lg:hidden"
            >
              <Users className="w-4 h-4" />
              <span>({members.length})</span>
            </Button>
          </div>
        </div>

        {!canEdit && status !== "loading" && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-medium">
            Viewer Mode: You can view content but cannot edit this document.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Formatting Toolbar */}
        {editor && canEdit && (
          <div className="flex flex-wrap items-center gap-1 p-1.5 mb-6 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("bold")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("italic")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("strike")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("code")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Code"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("heading", { level: 1 })
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("heading", { level: 2 })
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("bulletList")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("orderedList")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Ordered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                editor.isActive("blockquote")
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
              }`}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tiptap Text Content Area */}
        <div
          onClick={() => {
            if (canEdit) editor?.commands.focus();
          }}
          className="cursor-text"
        >
          <EditorContent editor={editor} />
        </div>
      </Card>

      {/* Collaborators & Sharing Drawer */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Collaborators
            </h4>
          </div>
          <Badge variant="indigo">{members.length}</Badge>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={m.username} size="xs" />
                <div className="truncate">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {m.username}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{m.role}</p>
                </div>
              </div>

              {isOwner && m.role !== "OWNER" && (
                <select
                  aria-label={`Role for ${m.username}`}
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value as MemberRole)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <form onSubmit={invite} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Add Collaborator
            </h5>
            <Input
              name="username"
              placeholder="Zeal Username"
              required
            />
            <select
              name="role"
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <Button type="submit" size="sm" className="w-full">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Collaborator</span>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
