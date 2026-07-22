"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DocumentEditor } from "@/components/document-editor";

export default function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  return <main className="min-h-screen bg-[#121212] p-4 sm:p-8"><div className="mx-auto mb-4 max-w-6xl"><Link href="/dashboard" className="text-sm font-semibold text-white hover:text-slate-300">← Documents</Link></div><DocumentEditor documentId={documentId} /></main>;
}
