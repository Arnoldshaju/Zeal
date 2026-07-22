"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DocumentEditor } from "@/components/editor/document-editor";

export default function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto mb-4 max-w-4xl"><Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to documents</Link></div><DocumentEditor documentId={documentId} /></main>;
}
