"use client";

import React from "react";
import { useParams } from "next/navigation";
import { DocumentEditor } from "@/components/document-editor";
import { Navbar } from "@/components/ui/navbar";

export default function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Document Editor" },
        ]}
      />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        <DocumentEditor documentId={documentId} />
      </main>
    </div>
  );
}
