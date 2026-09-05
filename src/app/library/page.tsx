"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsTab } from "@/components/library/projects-tab";
import { AssetsTab } from "@/components/library/assets-tab";
import { BrandOnboarding } from "@/components/brand/brand-onboarding";
import { Plus, Film, Image } from "lucide-react";

interface Project { id: string; title: string; status: string; creditsSpent: number; updatedAt: string; }
interface Asset { id: string; name: string; kind: string; source: string; mimeType: string; blobUrl: string; projectId: string | null; createdAt: string; }

export default function LibraryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const fetchAll = async () => {
    try {
      const [p, a] = await Promise.all([fetch("/api/projects", { credentials: "include" }), fetch("/api/assets", { credentials: "include" })]);
      if (p.ok) setProjects((await p.json()).projects || []);
      if (a.ok) setAssets((await a.json()).assets || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user) { setAuthed(true); fetchAll(); } else router.push("/login"); })
      .catch(() => router.push("/login"));
  }, [router]);

  const createProject = async () => {
    const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: "Untitled" }) });
    if (r.ok) { const d = await r.json(); router.push(`/projects/${d.project.id}`); }
  };

  if (!authed) return <div className="flex items-center justify-center h-screen"><div className="text-neutral-400 text-sm">Loading...</div></div>;

  return (
    <>
    <BrandOnboarding />
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">HAYK</h1>
            <span className="text-neutral-500 text-sm">Library</span>
          </div>
          <Button onClick={createProject} className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium"><Plus className="h-4 w-4 mr-2" /> New Project</Button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="projects" className="data-[state=active]:bg-neutral-800"><Film className="h-4 w-4 mr-2" /> Projects ({projects.length})</TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-neutral-800"><Image className="h-4 w-4 mr-2" /> Assets ({assets.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="projects" className="mt-6">
              <ProjectsTab projects={projects} assets={assets} loading={loading} onRefresh={fetchAll} />
            </TabsContent>
            <TabsContent value="assets" className="mt-6">
              <AssetsTab assets={assets} categories={["character", "product", "location", "costume", "prop", "style", "reference"]} onRefresh={fetchAll} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
    </>
  );
}
