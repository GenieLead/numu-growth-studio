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
}

const DIRECTOR_OPENING = "What are we making?";

export function ChatWorkspace({ projectId, projectTitle }: ChatWorkspaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
            content: typeof m.content === "object" && m.content?.text
              ? m.content.text
              : m.content,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    if (sending) return;

    // Add user message immediately
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    // Persist user message
    await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: "user", content: text }),
    });

    // Generate Director response (placeholder for now)
    setTimeout(async () => {
      const response = generateDirectorResponse(text);
      const assistantMsg: Message = {
        id: `temp-${Date.now()}`,
        role: "assistant",
        content: response,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "assistant", content: response }),
      });

      setSending(false);
    }, 800);
  };

  // Temporary Director response — will be replaced with AI in Phase 4+
  function generateDirectorResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase();

    if (lower.includes("video") || lower.includes("ad") || lower.includes("commercial")) {
      return "Great idea. Let me understand a few things:\n\n• What's the product or brand?\n• Do you have a reference video or image I should work from?\n• How long should the final video be?";
    }

    if (lower.includes("image") || lower.includes("photo") || lower.includes("picture")) {
      return "Got it. Tell me more:\n\n• What should the image show?\n• Any specific style or mood?\n• Do you have reference images?";
    }

    if (lower.includes("reference") || lower.includes("upload") || lower.includes("video of")) {
      return "I can work with that. Upload the reference and I'll analyze the shots, motion, and editing style.";
    }

    return "Interesting. Can you tell me more about what you're envisioning? For example:\n\n• What type of content — video, image, or both?\n• What's it for — ad, social media, brand content?\n• Any references or specific style in mind?";
  }

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
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <ChatComposer onSend={handleSend} disabled={sending} />
    </div>
  );
}
