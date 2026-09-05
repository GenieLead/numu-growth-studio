"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KnowledgeItem {
  id: string;
  title: string;
  textContent: string;
  sourceType: string;
  createdAt: string;
}

export function KnowledgeUpload({ brandId }: { brandId: string }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchItems();
  }, [brandId]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/brands/${brandId}/knowledge`, { credentials: "include" });
      const data = await res.json();
      setItems(data.items ?? data.knowledge ?? []);
    } catch {}
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const text = await file.text();
      setLoading(true);
      try {
        await fetch(`/api/brands/${brandId}/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: file.name.replace(/\.(txt|md)$/, ""),
            textContent: text,
            sourceType: file.name.endsWith(".md") ? "markdown" : "text",
          }),
        });
        await fetchItems();
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePaste = async () => {
    if (!textContent.trim()) return;
    setLoading(true);
    try {
      await fetch(`/api/brands/${brandId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim() || "Pasted knowledge",
          textContent: textContent.trim(),
          sourceType: "paste",
        }),
      });
      setTextContent("");
      setTitle("");
      await fetchItems();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/brands/${brandId}/knowledge/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetchItems();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-100">Knowledge Base</h3>

      {/* Upload area */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? "border-accent-lime bg-accent-lime/10"
            : "border-neutral-700 bg-neutral-800 hover:border-neutral-600"
        }`}
      >
        <svg
          className="mb-2 size-8 text-neutral-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-neutral-400">
          Drag & drop <span className="font-medium text-neutral-300">.txt</span> or{" "}
          <span className="font-medium text-neutral-300">.md</span> files here, or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Paste area */}
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="h-8 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
        />
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Paste knowledge text directly..."
          rows={4}
          className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
        />
        <Button
          onClick={handlePaste}
          disabled={!textContent.trim() || loading}
          className="bg-accent-lime text-black hover:bg-accent-lime/90"
        >
          {loading ? "Saving..." : "Add Knowledge"}
        </Button>
      </div>

      {/* Existing items */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Existing Items ({items.length})
          </h4>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-200">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {item.textContent.slice(0, 80)}
                    {item.textContent.length > 80 ? "..." : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {item.sourceType}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0"
                  >
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
