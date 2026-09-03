"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-neutral-400 hover:text-neutral-200"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Describe what you want to create..."
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 pr-12 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          size="icon"
          className="h-10 w-10 shrink-0 bg-accent-lime text-black hover:bg-accent-lime/90 disabled:opacity-30"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
