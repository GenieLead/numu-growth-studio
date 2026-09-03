"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, Film, Clock, DollarSign, Trash2, Copy, Pencil, Check, Upload, X, Image } from "lucide-react";

const DEFAULT_CATS = ["character", "product", "location", "costume", "prop", "style", "reference"];

interface Project { id: string; title: string; status: string; creditsSpent: number; updatedAt: string; }
interface Asset { id: string; name: string; kind: string; source: string; mimeType: string; blobUrl: string; projectId: string | null; createdAt: string; }

export default function LibraryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  // Project states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteProjectTitle, setDeleteProjectTitle] = useState("");
  const [deleteAssetsToo, setDeleteAssetsToo] = useState(true);

  // Asset states
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editAssetName, setEditAssetName] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user) { setAuthed(true); fetchAll(); } else router.push("/login"); })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchAll = async () => {
    try {
      const [p, a] = await Promise.all([fetch("/api/projects", { credentials: "include" }), fetch("/api/assets", { credentials: "include" })]);
      if (p.ok) setProjects((await p.json()).projects || []);
      if (a.ok) setAssets((await a.json()).assets || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // ── Projects ──
  const createProject = async () => {
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled" }) });
    if (r.ok) { const d = await r.json(); router.push(`/projects/${d.project.id}`); }
  };
  const renameProject = async (id: string) => {
    if (!editTitle.trim()) return;
    await fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, title: editTitle }) });
    setProjects((p) => p.map((x) => x.id === id ? { ...x, title: editTitle } : x));
    setEditingId(null);
  };
  const duplicateProject = async (id: string) => {
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ duplicateFromId: id }) });
    fetchAll();
  };
  const executeDeleteProject = async () => {
    if (!deleteProjectId) return;
    if (deleteAssetsToo) { const pa = assets.filter((a) => a.projectId === deleteProjectId); for (const a of pa) await fetch(`/api/assets?id=${a.id}`, { method: "DELETE", credentials: "include" }); setAssets((p) => p.filter((x) => x.projectId !== deleteProjectId)); }
    await fetch(`/api/projects?id=${deleteProjectId}`, { method: "DELETE", credentials: "include" });
    setProjects((p) => p.filter((x) => x.id !== deleteProjectId));
    setDeleteProjectId(null);
  };

  // ── Assets ──
  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/assets/upload", { method: "POST", credentials: "include", body: fd });
      if (r.ok) { const d = await r.json(); setAssets((prev) => [{ id: d.assetId, name: d.name, kind: d.kind, source: "uploaded", mimeType: d.mimeType, blobUrl: d.url, projectId: null, createdAt: new Date().toISOString() }, ...prev]); }
    }
    setUploading(false); if (uploadRef.current) uploadRef.current.value = "";
  };
  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    await fetch("/api/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, ...updates }) });
    setAssets((p) => p.map((a) => a.id === id ? { ...a, ...updates } : a));
  };
  const deleteAsset = async (id: string) => {
    await fetch(`/api/assets?id=${id}`, { method: "DELETE", credentials: "include" });
    setAssets((p) => p.filter((a) => a.id !== id));
  };
  const addCategory = () => {
    if (newCatName.trim() && !categories.includes(newCatName.trim())) { setCategories((c) => [...c, newCatName.trim()]); setNewCatName(""); setShowNewCat(false); }
  };

  // ── Select + Bulk ──
  const toggleSelect = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => { const filtered = filteredAssets; setSelected((p) => p.size === filtered.length ? new Set() : new Set(filtered.map((a) => a.id))); };
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setBulkCategory(""); };

  const bulkDelete = async () => {
    for (const id of selected) await fetch(`/api/assets?id=${id}`, { method: "DELETE", credentials: "include" });
    setAssets((p) => p.filter((a) => !selected.has(a.id)));
    exitSelect();
  };
  const bulkUseInProject = async () => {
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled" }) });
    if (r.ok) {
      const d = await r.json();
      const selectedAssetsList = assets.filter((a) => selected.has(a.id));
      // Attach first asset via URL param, rest will be uploaded when project loads
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
    setAssets((p) => p.map((a) => selected.has(a.id) ? { ...a, kind: bulkCategory } : a));
    exitSelect();
  };

  const filteredAssets = filterCategory === "all" ? assets : assets.filter((a) => a.kind === filterCategory);
  const catCounts = categories.reduce((acc, c) => { acc[c] = assets.filter((a) => a.kind === c).length; return acc; }, {} as Record<string, number>);

  if (!authed) return <div className="flex items-center justify-center h-screen"><div className="text-neutral-400 text-sm">Loading...</div></div>;

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h1 className="text-lg font-semibold">Library</h1>
          <Button onClick={createProject} className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium"><Plus className="h-4 w-4 mr-2" /> New Project</Button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="projects" className="data-[state=active]:bg-neutral-800"><Film className="h-4 w-4 mr-2" /> Projects ({projects.length})</TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-neutral-800"><Image className="h-4 w-4 mr-2" /> Assets ({assets.length})</TabsTrigger>
            </TabsList>

            {/* ─── PROJECTS ─── */}
            <TabsContent value="projects" className="mt-6">
              {loading ? <div className="text-center text-neutral-400 text-sm py-12">Loading...</div>
                : projects.length === 0 ? (
                  <div className="text-center py-12"><div className="text-neutral-400 text-sm mb-4">No projects yet.</div>
                    <Button onClick={createProject} variant="outline" className="border-neutral-700"><Plus className="h-4 w-4 mr-2" /> New Project</Button></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((p) => (
                      <Card key={p.id} className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer group" onClick={() => editingId !== p.id && router.push(`/projects/${p.id}`)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            {editingId === p.id ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") renameProject(p.id); if (e.key === "Escape") setEditingId(null); }} className="h-7 text-sm bg-neutral-800 border-neutral-600 flex-1" autoFocus onClick={(e) => e.stopPropagation()} />
                                <button onClick={(e) => { e.stopPropagation(); renameProject(p.id); }} className="h-7 w-7 rounded bg-accent-lime flex items-center justify-center shrink-0"><Check className="h-3.5 w-3.5 text-black" /></button>
                              </div>
                            ) : <CardTitle className="text-base font-medium truncate">{p.title}</CardTitle>}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-neutral-800" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 w-40">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/projects/${p.id}`); }}><Film className="mr-2 h-4 w-4" />Open</DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditTitle(p.title); }}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateProject(p.id); }}><Copy className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-neutral-800" />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteProjectId(p.id); setDeleteProjectTitle(p.title); setDeleteAssetsToo(true); }} className="text-red-400"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription><Badge variant="secondary" className="bg-neutral-800 text-neutral-300 text-xs">{p.status}</Badge></CardDescription>
                        </CardHeader>
                        <CardContent><div className="flex items-center gap-4 text-xs text-neutral-400"><span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{p.creditsSpent.toFixed(2)}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.updatedAt).toLocaleDateString()}</span></div></CardContent>
                      </Card>
                    ))}
                  </div>
                )}
            </TabsContent>

            {/* ─── ASSETS ─── */}
            <TabsContent value="assets" className="mt-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                {/* Left: filters or bulk actions */}
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
                {/* Right: upload or select */}
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

              {/* Grid */}
              {filteredAssets.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">{assets.length === 0 ? "Upload assets to get started." : "No assets in this category."}</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredAssets.map((asset) => (
                    <div key={asset.id} className={`bg-neutral-900 border rounded-lg overflow-hidden group relative transition-colors ${selected.has(asset.id) ? "border-accent-lime" : "border-neutral-800 hover:border-neutral-700"}`}
                      onClick={() => selectMode ? toggleSelect(asset.id) : null}>
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Project Dialog */}
      <Dialog open={!!deleteProjectId} onOpenChange={(o) => { if (!o) setDeleteProjectId(null); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader><DialogTitle>Delete "{deleteProjectTitle}"?</DialogTitle><DialogDescription className="text-neutral-400">This cannot be undone.</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2 py-2"><input type="checkbox" id="da" checked={deleteAssetsToo} onChange={(e) => setDeleteAssetsToo(e.target.checked)} className="accent-accent-lime" /><label htmlFor="da" className="text-sm text-neutral-300">Also delete {assets.filter((a) => a.projectId === deleteProjectId).length} assets</label></div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteProjectId(null)} className="border-neutral-700">Cancel</Button><Button onClick={executeDeleteProject} className="bg-red-600 hover:bg-red-500 text-white">Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
