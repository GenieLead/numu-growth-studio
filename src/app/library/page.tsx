"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Film, Image, Clock, DollarSign, Trash2, Copy, Pencil, Check, X } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  creditsSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface Asset {
  id: string;
  name: string;
  kind: string;
  source: string;
  mimeType: string;
  blobUrl: string;
  projectId: string | null;
  createdAt: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Delete project dialog
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteProjectTitle, setDeleteProjectTitle] = useState("");
  const [deleteAssetsToo, setDeleteAssetsToo] = useState(true);

  // Asset selection
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setAuthed(true);
          fetchAll();
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchAll = async () => {
    try {
      const [projRes, assetRes] = await Promise.all([
        fetch("/api/projects", { credentials: "include" }),
        fetch("/api/assets", { credentials: "include" }),
      ]);
      if (projRes.ok) setProjects((await projRes.json()).projects || []);
      if (assetRes.ok) setAssets((await assetRes.json()).assets || []);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: "Untitled" }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/projects/${data.project.id}`);
    }
  };

  const duplicateProject = async (id: string) => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ duplicateFromId: id }),
    });
    fetchAll();
  };

  const renameProject = async (id: string) => {
    if (!editTitle.trim()) return;
    await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, title: editTitle }),
    });
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, title: editTitle } : p)));
    setEditingId(null);
  };

  const confirmDeleteProject = (id: string, title: string) => {
    setDeleteProjectId(id);
    setDeleteProjectTitle(title);
    setDeleteAssetsToo(true);
  };

  const executeDeleteProject = async () => {
    if (!deleteProjectId) return;

    // Delete associated assets if requested
    if (deleteAssetsToo) {
      const projectAssets = assets.filter((a) => a.projectId === deleteProjectId);
      for (const asset of projectAssets) {
        await fetch(`/api/assets?id=${asset.id}`, { method: "DELETE", credentials: "include" });
      }
      setAssets((prev) => prev.filter((a) => a.projectId !== deleteProjectId));
    }

    // Delete project
    await fetch(`/api/projects?id=${deleteProjectId}`, { method: "DELETE", credentials: "include" });
    setProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
    setDeleteProjectId(null);
  };

  // Asset selection
  const toggleAssetSelect = (id: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllAssets = () => {
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map((a) => a.id)));
    }
  };

  const deleteSelectedAssets = async () => {
    for (const id of selectedAssets) {
      await fetch(`/api/assets?id=${id}`, { method: "DELETE", credentials: "include" });
    }
    setAssets((prev) => prev.filter((a) => !selectedAssets.has(a.id)));
    setSelectedAssets(new Set());
    setSelectMode(false);
  };

  if (!authed) {
    return <div className="flex items-center justify-center h-screen"><div className="text-neutral-400 text-sm">Loading...</div></div>;
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h1 className="text-lg font-semibold">Library</h1>
          <Button onClick={createProject} className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium">
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="projects" className="data-[state=active]:bg-neutral-800">
                <Film className="h-4 w-4 mr-2" /> Projects ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-neutral-800">
                <Image className="h-4 w-4 mr-2" /> Assets ({assets.length})
              </TabsTrigger>
            </TabsList>

            {/* PROJECTS */}
            <TabsContent value="projects" className="mt-6">
              {loading ? (
                <div className="text-center text-neutral-400 text-sm py-12">Loading...</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-neutral-400 text-sm mb-4">No projects yet.</div>
                  <Button onClick={createProject} variant="outline" className="border-neutral-700">
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer group"
                      onClick={() => editingId !== project.id && router.push(`/projects/${project.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          {editingId === project.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") renameProject(project.id); if (e.key === "Escape") setEditingId(null); }}
                                className="h-7 text-sm bg-neutral-800 border-neutral-600 flex-1"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); renameProject(project.id); }} className="h-7 w-7 rounded bg-accent-lime flex items-center justify-center shrink-0">
                                <Check className="h-3.5 w-3.5 text-black" />
                              </button>
                            </div>
                          ) : (
                            <CardTitle className="text-base font-medium truncate">{project.title}</CardTitle>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-neutral-800 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 w-40">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}>
                                <Film className="mr-2 h-4 w-4" /> Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingId(project.id); setEditTitle(project.title); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-neutral-800" />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project.id, project.title); }} className="text-red-400 focus:text-red-300">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300">{project.status}</Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-neutral-400">
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{project.creditsSpent.toFixed(2)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ASSETS */}
            <TabsContent value="assets" className="mt-6">
              {assets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-neutral-400 text-sm">Assets you upload in projects appear here automatically.</div>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {selectMode ? (
                        <>
                          <Button variant="outline" size="sm" className="border-neutral-700" onClick={selectAllAssets}>
                            {selectedAssets.size === assets.length ? "Deselect All" : "Select All"}
                          </Button>
                          <span className="text-xs text-neutral-500">{selectedAssets.size} selected</span>
                          {selectedAssets.size > 0 && (
                            <Button variant="outline" size="sm" className="border-red-700 text-red-400 hover:bg-red-500/10" onClick={deleteSelectedAssets}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedAssets.size})
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelectedAssets(new Set()); }}>
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" className="border-neutral-700" onClick={() => setSelectMode(true)}>
                          Select
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`bg-neutral-900 border rounded-lg overflow-hidden cursor-pointer transition-colors ${
                          selectedAssets.has(asset.id) ? "border-accent-lime" : "border-neutral-800 hover:border-neutral-700"
                        }`}
                        onClick={() => selectMode ? toggleAssetSelect(asset.id) : null}
                      >
                        <div className="relative">
                          {asset.mimeType.startsWith("image/") ? (
                            <img src={asset.blobUrl} alt={asset.name} className="w-full h-32 object-cover" />
                          ) : asset.mimeType.startsWith("video/") ? (
                            <video src={asset.blobUrl} className="w-full h-32 object-cover" muted playsInline />
                          ) : (
                            <div className="w-full h-32 bg-neutral-800 flex items-center justify-center text-neutral-500 text-xs">{asset.kind}</div>
                          )}
                          {selectMode && (
                            <div className={`absolute top-2 left-2 h-5 w-5 rounded border-2 flex items-center justify-center ${
                              selectedAssets.has(asset.id) ? "bg-accent-lime border-accent-lime" : "border-neutral-500 bg-black/40"
                            }`}>
                              {selectedAssets.has(asset.id) && <Check className="h-3 w-3 text-black" />}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                            <Badge variant="secondary" className="bg-neutral-800/80 text-neutral-300 text-[10px]">{asset.kind}</Badge>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-neutral-400 truncate">{asset.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Project Dialog */}
      <Dialog open={!!deleteProjectId} onOpenChange={(open) => { if (!open) setDeleteProjectId(null); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle>Delete "{deleteProjectTitle}"?</DialogTitle>
            <DialogDescription className="text-neutral-400">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="deleteAssets"
              checked={deleteAssetsToo}
              onChange={(e) => setDeleteAssetsToo(e.target.checked)}
              className="accent-accent-lime"
            />
            <label htmlFor="deleteAssets" className="text-sm text-neutral-300">
              Also delete {assets.filter((a) => a.projectId === deleteProjectId).length} assets from this project
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProjectId(null)} className="border-neutral-700">
              Cancel
            </Button>
            <Button onClick={executeDeleteProject} className="bg-red-600 hover:bg-red-500 text-white">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
