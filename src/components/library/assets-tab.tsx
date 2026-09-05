"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Film, Trash2, Check, Upload, X } from "lucide-react";

interface Asset { id: string; name: string; kind: string; source: string; mimeType: string; blobUrl: string; projectId: string | null; createdAt: string; }

interface AssetsTabProps {
  assets: Asset[];
  categories: string[];
  onRefresh: () => void;
}

export function AssetsTab({ assets, categories: initialCategories, onRefresh }: AssetsTabProps) {
  const router = useRouter();
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editAssetName, setEditAssetName] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");

  const filteredAssets = filterCategory === "all" ? assets : assets.filter((a) => a.kind === filterCategory);
  const catCounts = categories.reduce((acc, c) => { acc[c] = assets.filter((a) => a.kind === c).length; return acc; }, {} as Record<string, number>);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/assets/upload", { method: "POST", credentials: "include", body: fd });
      if (r.ok) { onRefresh(); }
    }
    setUploading(false); if (uploadRef.current) uploadRef.current.value = "";
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    await fetch("/api/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, ...updates }) });
    onRefresh();
  };

  const deleteAsset = async (id: string) => {
    await fetch(`/api/assets?id=${id}`, { method: "DELETE", credentials: "include" });
    onRefresh();
  };

  const addCategory = () => {
    if (newCatName.trim() && !categories.includes(newCatName.trim())) { setCategories((c) => [...c, newCatName.trim()]); setNewCatName(""); setShowNewCat(false); }
  };

  const toggleSelect = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  const selectAll = () => { setSelected((p) => p.size === filteredAssets.length ? new Set() : new Set(filteredAssets.map((a) => a.id))); };
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setBulkCategory(""); };

  const bulkDelete = async () => {
    for (const id of selected) await fetch(`/api/assets?id=${id}`, { method: "DELETE", credentials: "include" });
    onRefresh();
    exitSelect();
  };

  const bulkUseInProject = async () => {
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled" }) });
    if (r.ok) {
      const d = await r.json();
      const selectedAssetsList = assets.filter((a) => selected.has(a.id));
      const first = selectedAssetsList[0];
      if (first) {
        router.push(`/projects/${d.project.id}?attach=${encodeURIComponent(JSON.stringify({ multi: selectedAssetsList.map((a) => ({ assetId: a.id, url: a.blobUrl, name: a.name, mimeType: a.mimeType, kind: a.kind })) }))}`);
      } else {
        router.push(`/projects/${d.project.id}`);
      }
    }
  };

  const bulkChangeCategory = async () => {
    if (!bulkCategory) return;
    for (const id of selected) { await fetch("/api/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, kind: bulkCategory }) }); }
    onRefresh();
    exitSelect();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {selectMode ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={selectAll} className="px-2.5 py-1 rounded-full text-xs bg-neutral-800 text-neutral-300 hover:text-white">
              {selected.size === filteredAssets.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-xs text-neutral-500">{selected.size} selected</span>
            {selected.size > 0 && (
              <>
                <Select value={bulkCategory} onValueChange={(v) => setBulkCategory(v || "")}>
                  <SelectTrigger className="h-7 w-28 text-[10px] bg-neutral-800 border-neutral-700"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {bulkCategory && <Button size="sm" variant="outline" className="h-7 text-[10px] border-neutral-700" onClick={bulkChangeCategory}><Check className="h-3 w-3 mr-1" />Apply</Button>}
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-neutral-700" onClick={bulkUseInProject}><Film className="h-3 w-3 mr-1" />Use in Project</Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-700 text-red-400" onClick={bulkDelete}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                <button onClick={exitSelect} className="text-neutral-500 hover:text-neutral-300"><X className="h-4 w-4" /></button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setFilterCategory("all")} className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${filterCategory === "all" ? "bg-accent-lime text-black" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"}`}>All ({assets.length})</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setFilterCategory(c)} className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${filterCategory === c ? "bg-accent-lime text-black" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"}`}>{c} ({catCounts[c] || 0})</button>
            ))}
            {showNewCat ? (
              <div className="flex items-center gap-1">
                <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setShowNewCat(false); }} placeholder="name" className="h-6 w-16 text-[10px] bg-neutral-800 border-neutral-700" autoFocus />
                <button onClick={addCategory} className="h-6 w-6 rounded bg-accent-lime flex items-center justify-center"><Check className="h-3 w-3 text-black" /></button>
              </div>
            ) : <button onClick={() => setShowNewCat(true)} className="px-2 py-1 rounded-full text-[11px] bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700">+</button>}
          </div>
        )}
        <div className="flex items-center gap-2">
          {selectMode ? null : (
            <Button variant="outline" size="sm" className="h-7 text-[11px] border-neutral-700" onClick={() => setSelectMode(true)}>Select</Button>
          )}
          <input ref={uploadRef} type="file" accept="image/*,video/*,audio/*" multiple onChange={(e) => handleUpload(e.target.files)} className="hidden" />
          <Button onClick={() => uploadRef.current?.click()} disabled={uploading} size="sm" className="h-7 text-[11px] bg-accent-lime text-black hover:bg-accent-lime/90">
            <Upload className="h-3 w-3 mr-1" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 text-sm">{assets.length === 0 ? "Upload assets to get started." : "No assets in this category."}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className={`bg-neutral-900 border rounded-lg overflow-hidden group relative transition-colors ${selected.has(asset.id) ? "border-accent-lime" : "border-neutral-800 hover:border-neutral-700"}`}
              onClick={() => { if (selectMode) toggleSelect(asset.id); }}>
              <div className="relative">
                {asset.mimeType.startsWith("image/") ? <img src={asset.blobUrl} alt={asset.name} className="w-full h-32 object-cover" />
                  : asset.mimeType.startsWith("video/") ? <video src={asset.blobUrl} className="w-full h-32 object-cover" muted playsInline />
                    : <div className="w-full h-32 bg-neutral-800 flex items-center justify-center text-neutral-500 text-xs">{asset.kind}</div>}
                {selectMode && (
                  <div className={`absolute top-2 left-2 h-5 w-5 rounded border-2 flex items-center justify-center ${selected.has(asset.id) ? "bg-accent-lime border-accent-lime" : "border-neutral-500 bg-black/40"}`}>
                    {selected.has(asset.id) && <Check className="h-3 w-3 text-black" />}
                  </div>
                )}
                {!selectMode && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-6 w-6 rounded bg-black/60 hover:bg-black/80 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3.5 w-3.5 text-white" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 w-36">
                        <DropdownMenuItem onClick={() => { fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled" }) }).then(r => r.json()).then(d => { if (d.project?.id) router.push(`/projects/${d.project.id}?attach=${encodeURIComponent(JSON.stringify({ assetId: asset.id, url: asset.blobUrl, name: asset.name, mimeType: asset.mimeType, kind: asset.kind }))}`); }); }}>Use in Project</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-neutral-800" />
                        <DropdownMenuItem onClick={() => deleteAsset(asset.id)} className="text-red-400"><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5 space-y-1">
                {editingAssetId === asset.id ? (
                  <div className="flex items-center gap-1">
                    <Input value={editAssetName} onChange={(e) => setEditAssetName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { updateAsset(asset.id, { name: editAssetName }); setEditingAssetId(null); } if (e.key === "Escape") setEditingAssetId(null); }} className="h-5 text-[10px] bg-neutral-800 border-neutral-700 flex-1" autoFocus />
                  </div>
                ) : <p className="text-[11px] text-neutral-300 truncate cursor-pointer hover:text-neutral-100" onClick={() => { setEditingAssetId(asset.id); setEditAssetName(asset.name); }}>{asset.name}</p>}
                <Select value={asset.kind} onValueChange={(v) => v && updateAsset(asset.id, { kind: v })}>
                  <SelectTrigger className="h-5 text-[10px] bg-neutral-800 border-neutral-700 px-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
