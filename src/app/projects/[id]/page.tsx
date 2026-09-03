"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChatWorkspace } from "@/components/chat-workspace";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auth/get-session`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) {
          router.push("/login");
        } else {
          setLoading(false);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-neutral-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatWorkspace projectId={projectId} projectTitle={projectTitle} />
    </div>
  );
}
