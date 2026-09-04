"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatComposer } from "@/components/chat-composer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Film, Loader2, Check, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

interface GenerationPlan {
  task_type: string;
  prompt: string;
  reference_urls: string[];
  asset_urls: {
    character: string | null;
    product: string | null;
    location: string | null;
  };
  settings: {
    duration: number;
    resolution: string;
    aspect_ratio: string;
  };
  estimated_credits: number;
  model_recommendation: string;
}

interface ActiveGeneration {
  generationId: string;
  provider: string;
  taskId: string;
  model: string;
  status: string;
  videoUrl?: string;
  error?: string;
}

interface ChatWorkspaceProps {
  projectId: string;
  projectTitle: string;
  initialAttach?: {
    assetId: string;
    url: string;
    name: string;
    mimeType: string;
    kind: string;
    multi?: { assetId: string; url: string; name: string; mimeType: string; kind: string }[];
  } | null;
}

const DIRECTOR_OPENING = "What are we making?";

export function ChatWorkspace({
  projectId,
  projectTitle,
  initialAttach,
}: ChatWorkspaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendTimer, setSendTimer] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generation state
  const [pendingPlan, setPendingPlan] = useState<GenerationPlan | null>(null);
  const [activeGeneration, setActiveGeneration] = useState<ActiveGeneration | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingPlan, activeGeneration]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];

        if (msgs.length === 0) {
          const systemMsg: Message = {
            id: "system-1",
            role: "assistant",
            content: DIRECTOR_OPENING,
            createdAt: new Date().toISOString(),
          };
          setMessages([systemMsg]);

          await fetch(`/api/projects/${projectId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              role: "assistant",
              content: DIRECTOR_OPENING,
            }),
          });
        } else {
          setMessages(
            msgs.map((m: any) => ({
              ...m,
              content: m.content,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (
    text: string,
    attachments?: { assetId: string; url: string; name: string; mimeType: string; kind?: string; customName?: string }[]
  ) => {
    if (sending) return;

    const content =
      attachments && attachments.length > 0
        ? { text, attachments }
        : text;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content as any,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setSendTimer(0);
    timerRef.current = setInterval(() => setSendTimer((t) => t + 1), 1000);

    // Clear any pending plan when user sends new message
    setPendingPlan(null);

    // Save user message
    await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: "user", content }),
    });

    // Call Director AI
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, content }),
      });

      const data = await res.json();

      if (data.error) {
        const errorMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "assistant",
          content: data.error.includes("Invalid URL")
            ? "Image couldn't be analyzed. Try describing it in text instead."
            : `Something went wrong. Try again.`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const assistantMsg: Message = {
          id: data.messageId || `temp-${Date.now()}`,
          role: "assistant",
          content: data.text,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // If there's a generation plan, show it
        if (data.generationPlan) {
          setPendingPlan(data.generationPlan);
        }
      }
    } catch {
      const errorMsg: Message = {
        id: `temp-${Date.now()}`,
        role: "assistant",
        content: "Network error. Check your connection and try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setSending(false);
  };

  const handleGenerate = useCallback(
    async (plan: GenerationPlan) => {
      setPendingPlan(null);

      // Add system message about generation starting
      const sysMsg: Message = {
        id: `sys-${Date.now()}`,
        role: "system_event",
        content: "Generation started...",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, sysMsg]);

      try {
        const res = await fetch(`/api/projects/${projectId}/generate-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            ...plan,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          const errorMsg: Message = {
            id: `temp-${Date.now()}`,
            role: "assistant",
            content: `Generation failed: ${err.error || "Unknown error"}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          return;
        }

        const data = await res.json();
        setActiveGeneration({
          generationId: data.generationId,
          provider: data.provider,
          taskId: data.taskId,
          model: data.model,
          status: "pending",
        });

        // Start polling
        startPolling(data.generationId);
      } catch {
        const errorMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "assistant",
          content: "Failed to start generation. Try again.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    },
    [projectId]
  );

  const startPolling = useCallback(
    (generationId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/projects/${projectId}/poll-generation?generationId=${generationId}`,
            { credentials: "include" }
          );

          if (!res.ok) return;

          const data = await res.json();

          setActiveGeneration((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.status,
                  videoUrl: data.videoUrl,
                  error: data.error,
                }
              : null
          );

          if (data.status === "completed" || data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);

            if (data.status === "completed" && data.videoUrl) {
              // Add video result as a message
              const resultMsg: Message = {
                id: `gen-${Date.now()}`,
                role: "assistant",
                content: {
                  type: "generation_result",
                  videoUrl: data.videoUrl,
                  model: activeGeneration?.model || "video",
                },
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, resultMsg]);
            } else if (data.status === "failed") {
              const errorMsg: Message = {
                id: `gen-err-${Date.now()}`,
                role: "assistant",
                content: `Generation failed: ${data.error || "Unknown error"}. You can try again.`,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, errorMsg]);
            }

            setActiveGeneration(null);
          }
        } catch {
          // Poll error — keep trying
        }
      }, 5000);
    },
    [projectId, activeGeneration?.model]
  );

  const handleCancelGeneration = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setActiveGeneration(null);
    setPendingPlan(null);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-neutral-400 text-sm">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
        <button
          onClick={() => router.push("/library")}
          className="p-1 rounded hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-neutral-400" />
        </button>
        <h1 className="text-sm font-medium truncate">
          {projectTitle || "Untitled"}
        </h1>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-1">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as "user" | "assistant" | "system_event"}
              content={msg.content as string}
            />
          ))}

          {/* Active Generation Status */}
          {activeGeneration && (
            <div className="flex gap-3 py-3">
              <div className="h-8 w-8 rounded-full bg-accent-lime flex items-center justify-center shrink-0">
                <Film className="h-4 w-4 text-black" />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 max-w-sm">
                {activeGeneration.status === "completed" && activeGeneration.videoUrl ? (
                  <div>
                    <video
                      src={activeGeneration.videoUrl}
                      className="w-full rounded-lg mb-2"
                      controls
                      playsInline
                    />
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Complete</span>
                    </div>
                  </div>
                ) : activeGeneration.status === "failed" ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">
                      Failed: {activeGeneration.error || "Unknown error"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 text-accent-lime animate-spin" />
                    <div>
                      <p className="text-sm font-medium">Generating...</p>
                      <p className="text-xs text-neutral-500">
                        {activeGeneration.model} — this may take a few minutes
                      </p>
                    </div>
                  </div>
                )}
                {(activeGeneration.status === "pending" || activeGeneration.status === "in_progress") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelGeneration}
                    className="mt-2 text-xs text-neutral-500 hover:text-neutral-300"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Pending Generation Plan */}
          {pendingPlan && !activeGeneration && (
            <div className="flex gap-3 py-3">
              <div className="h-8 w-8 rounded-full bg-accent-lime flex items-center justify-center shrink-0">
                <Film className="h-4 w-4 text-black" />
              </div>
              <div className="bg-neutral-900 border border-accent-lime/30 rounded-lg px-4 py-3 max-w-md">
                <p className="text-sm font-medium mb-2">Ready to generate</p>
                <div className="text-xs text-neutral-400 space-y-1 mb-3">
                  <p>
                    <span className="text-neutral-500">Type:</span>{" "}
                    {pendingPlan.task_type.replace(/_/g, " ")}
                  </p>
                  <p>
                    <span className="text-neutral-500">Duration:</span>{" "}
                    {pendingPlan.settings.duration}s
                  </p>
                  <p>
                    <span className="text-neutral-500">Format:</span>{" "}
                    {pendingPlan.settings.aspect_ratio} ·{" "}
                    {pendingPlan.settings.resolution}
                  </p>
                  {pendingPlan.estimated_credits > 0 && (
                    <p>
                      <span className="text-neutral-500">Est. cost:</span>{" "}
                      {pendingPlan.estimated_credits} credits
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleGenerate(pendingPlan)}
                    className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium text-xs"
                  >
                    Generate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingPlan(null)}
                    className="border-neutral-700 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sending indicator */}
          {sending && (
            <div className="flex gap-3 py-3">
              <div className="h-8 w-8 rounded-full bg-accent-lime flex items-center justify-center shrink-0">
                <span className="text-black text-xs font-medium">N</span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 tabular-nums">
                    {sendTimer}s
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        disabled={sending || !!activeGeneration}
        projectId={projectId}
        initialAttach={initialAttach}
      />
    </div>
  );
}
