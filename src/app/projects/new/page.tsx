"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: "Untitled" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.project?.id) {
          router.replace(`/projects/${data.project.id}`);
        } else {
          router.push("/library");
        }
      })
      .catch(() => router.push("/library"));
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-neutral-400 text-sm">Creating project...</div>
    </div>
  );
}
