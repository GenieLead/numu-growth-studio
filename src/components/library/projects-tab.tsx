"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Film, Clock, DollarSign, Trash2, Copy, Pencil, Check } from "lucide-react";

interface Project { id: string; title: string; status: string; creditsSpent: number; updatedAt: string; }
interface Asset { id: string; name: string; kind: string; source: string; mimeType: string; blobUrl: string; projectId: string | null; createdAt: string; }

interface ProjectsTabProps {
  projects: Project[];
  assets: Asset[];
  loading: boolean;
  onRefresh: () => void;
}

export function ProjectsTab({ projects, assets, loading, onRefresh }: ProjectsTabProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteProjectTitle, setDeleteProjectTitle] = useState("");
  const [deleteAssetsToo, setDeleteAssetsToo] = useState(true);

  const createProject = async () => {
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled" }) });
    if (r.ok) { const d = await r.json(); router.push(`/projects/${d.project.id}`); }
  };

  const renameProject = async (id: string) => {
    if (!editTitle.trim()) return;
    await fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, title: editTitle }) });
    setEditingId(null);
    onRefresh();
  };

  const duplicateProject = async (id: string) => {
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ duplicateFromId: id }) });
    onRefresh();
  };

  const executeDeleteProject = async () => {
    if (!deleteProjectId) return;
    if (deleteAssetsToo) {
      const pa = assets.filter((a) => a.projectId === deleteProjectId);
      for (const a of pa) await fetch(`/api/assets?id=${a.id}`, { method: "DELETE", credentials: "include" });
    }
    await fetch(`/api/projects?id=${deleteProjectId}`, { method: "DELETE", credentials: "include" });
    setDeleteProjectId(null);
    onRefresh();
  };

  if (loading) {
    return <div className="text-center text-neutral-400 text-sm py-12">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-neutral-400 text-sm mb-4">No projects yet.</div>
        <Button onClick={createProject} variant="outline" className="border-neutral-700">
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>
    );
  }

  return (
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

      <Dialog open={!!deleteProjectId} onOpenChange={(o) => { if (!o) setDeleteProjectId(null); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader><DialogTitle>Delete &quot;{deleteProjectTitle}&quot;?</DialogTitle><DialogDescription className="text-neutral-400">This cannot be undone.</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2 py-2"><input type="checkbox" id="da" checked={deleteAssetsToo} onChange={(e) => setDeleteAssetsToo(e.target.checked)} className="accent-accent-lime" /><label htmlFor="da" className="text-sm text-neutral-300">Also delete {assets.filter((a) => a.projectId === deleteProjectId).length} assets</label></div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteProjectId(null)} className="border-neutral-700">Cancel</Button><Button onClick={executeDeleteProject} className="bg-red-600 hover:bg-red-500 text-white">Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
