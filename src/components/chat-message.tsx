"use client";

import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system_event";
  content: string | { text?: string; type?: string; [key: string]: unknown };
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const text = typeof content === "string" ? content : content?.text || JSON.stringify(content);

  if (role === "system_event") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full">
          {text}
        </span>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={`flex gap-3 py-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-neutral-700" : "bg-accent-lime"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-black" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-neutral-800 text-neutral-100"
            : "bg-neutral-900 border border-neutral-800 text-neutral-200"
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
