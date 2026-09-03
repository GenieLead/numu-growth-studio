"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChatWorkspace } from "@/components/chat-workspace";

function ProjectContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(true);

  const attachParam = searchParams.get("attach");
  const initialAttach = attachParam ? JSON.parse(decodeURIComponent(attachParam)) : null;

  useEffect(() => {
    fetch("/api/auth/get-session", { credentials: "include" })
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
      <ChatWorkspace projectId={projectId} projectTitle="" initialAttach={initialAttach} />
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-neutral-400 text-sm">Loading...</div></div>}>
      <ProjectContent />
    </Suspense>
  );
}
