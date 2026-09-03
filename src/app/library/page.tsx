"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { Plus, MoreHorizontal, Film, Image, Clock, DollarSign } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  creditsSpent: number;
  createdAt: string;
  updatedAt: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (!session?.user) {
        router.push("/login");
      } else {
        setAuthChecked(true);
        fetchProjects();
      }
    });
  }, [router]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    try {
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
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  if (!authChecked) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-neutral-400 text-sm">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h1 className="text-lg font-semibold">Library</h1>
          <Button
            onClick={createProject}
            className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="projects" className="data-[state=active]:bg-neutral-800">
                <Film className="h-4 w-4 mr-2" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-neutral-800">
                <Image className="h-4 w-4 mr-2" />
                Assets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-6">
              {loading ? (
                <div className="text-center text-neutral-400 text-sm py-12">
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-neutral-400 text-sm mb-4">
                    No projects yet. Create your first one.
                  </div>
                  <Button
                    onClick={createProject}
                    variant="outline"
                    className="border-neutral-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-medium truncate">
                            {project.title}
                          </CardTitle>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300">
                            {project.status}
                          </Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-neutral-400">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {project.creditsSpent.toFixed(2)} credits
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assets" className="mt-6">
              <div className="text-center py-12">
                <div className="text-neutral-400 text-sm">
                  Assets you upload or generate will appear here.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
