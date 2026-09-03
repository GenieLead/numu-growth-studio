"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatComposer } from "@/components/chat-composer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: unknown;
  createdAt: string;
}

interface ChatWorkspaceProps {
  projectId: string;
  projectTitle: string;
  initialAttach?: { assetId: string; url: string; name: string; mimeType: string; kind: string; multi?: { assetId: string; url: string; name: string; mimeType: string; kind: string }[] } | null;
}

const DIRECTOR_OPENING = "What are we making?";

export function ChatWorkspace({ projectId, projectTitle, initialAttach }: ChatWorkspaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendTimer, setSendTimer] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];

        if (msgs.length === 0) {
          // First time — send Director opening
          const systemMsg: Message = {
            id: "system-1",
            role: "assistant",
            content: DIRECTOR_OPENING,
            createdAt: new Date().toISOString(),
          };
          setMessages([systemMsg]);

          // Persist the opening
          await fetch(`/api/projects/${projectId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ role: "assistant", content: DIRECTOR_OPENING }),
          });
        } else {
          setMessages(msgs.map((m: any) => ({
            ...m,
            content: m.content,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text: string, attachments?: { assetId: string; url: string; name: string; mimeType: string; kind?: string; customName?: string }[]) => {
    if (sending) return;

    const content = attachments && attachments.length > 0
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
          content: data.error.includes("Invalid URL") ? "Image couldn't be analyzed. Try describing it in text instead." : `Something went wrong. Try again.`,
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
      }
    } catch (error) {
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
        <h1 className="text-sm font-medium truncate">{projectTitle || "Untitled"}</h1>
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
          {sending && (
            <div className="flex gap-3 py-3">
              <div className="h-8 w-8 rounded-full bg-accent-lime flex items-center justify-center shrink-0">
                <span className="text-black text-xs font-medium">N</span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[10px] text-neutral-500 tabular-nums">{sendTimer}s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <ChatComposer onSend={handleSend} disabled={sending} projectId={projectId} initialAttach={initialAttach} />
    </div>
  );
}
