"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X } from "lucide-react";
import { MediaPreviewCard } from "@/components/media-preview-card";

interface UploadedFile {
  assetId: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

interface ChatComposerProps {
  onSend: (message: string, attachments?: UploadedFile[]) => void;
  disabled?: boolean;
  projectId?: string;
}

export function ChatComposer({ onSend, disabled, projectId }: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return;
    onSend(message.trim() || "Here's my reference", attachments.length > 0 ? attachments : undefined);
    setMessage("");
    setAttachments([]);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (projectId) formData.append("projectId", projectId);

        const res = await fetch("/api/assets/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          newAttachments.push({
            assetId: data.assetId,
            url: data.url,
            name: data.name,
            mimeType: data.mimeType,
            size: data.size,
          });
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-950 p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="max-w-3xl mx-auto mb-3 flex gap-3 overflow-x-auto pb-2">
          {attachments.map((att, i) => (
            <MediaPreviewCard
              key={att.assetId}
              name={att.name}
              url={att.url}
              mimeType={att.mimeType}
              size={att.size}
              onRemove={() => removeAttachment(i)}
            />
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
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
            placeholder={
              uploading
                ? "Uploading..."
                : attachments.length > 0
                  ? "Add a message about your reference..."
                  : "Describe what you want to create..."
            }
            rows={1}
            disabled={disabled || uploading}
            className="w-full resize-none bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 pr-12 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={(!message.trim() && attachments.length === 0) || disabled || uploading}
          size="icon"
          className="h-10 w-10 shrink-0 bg-accent-lime text-black hover:bg-accent-lime/90 disabled:opacity-30"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
