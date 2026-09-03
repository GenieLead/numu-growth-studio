"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip } from "lucide-react";
import { ReferenceCard, type UploadedFile, type ReferenceKind } from "@/components/reference-card";
import { VoiceRecorder } from "@/components/voice-recorder";

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
    onSend(message.trim() || "Here are my references", attachments.length > 0 ? attachments : undefined);
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
          const kind = data.kind === "video" ? "reference" : data.kind === "image" ? "reference" : "reference";
          setAttachments((prev) => [
            ...prev,
            {
              assetId: data.assetId,
              url: data.url,
              name: data.name,
              mimeType: data.mimeType,
              size: data.size,
              kind: kind as ReferenceKind,
              customName: "",
            },
          ]);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files.length) return;

    // Simulate file input
    if (fileInputRef.current) {
      fileInputRef.current.files = files;
      handleFileSelect({ target: { files } } as any);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      setUploading(true);
      for (const file of files) {
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
            setAttachments((prev) => [
              ...prev,
              {
                assetId: data.assetId,
                url: data.url,
                name: data.name,
                mimeType: data.mimeType,
                size: data.size,
                kind: "reference" as ReferenceKind,
                customName: "",
              },
            ]);
          }
        } catch (error) {
          console.error("Upload failed:", error);
        }
      }
      setUploading(false);
    }
  };

  const handleVoiceRecording = async (blob: Blob) => {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", projectId);

    setUploading(true);
    try {
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAttachments((prev) => [
          ...prev,
          {
            assetId: data.assetId,
            url: data.url,
            name: "Voice message",
            mimeType: data.mimeType,
            size: data.size,
            kind: "reference" as ReferenceKind,
            customName: "Voice message",
          },
        ]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
    setUploading(false);
  };

  const updateAttachment = (index: number, updates: Partial<UploadedFile>) => {
    setAttachments((prev) => prev.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Build @-mention hint text
  const namedRefs = attachments.filter((a) => a.customName);
  const atHint = namedRefs.length > 0
    ? `Referenced: ${namedRefs.map((a) => `@${a.customName}`).join(", ")}`
    : "";

  return (
    <div
      className="border-t border-neutral-800 bg-neutral-950 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="max-w-3xl mx-auto mb-3 flex gap-3 overflow-x-auto pb-2">
          {attachments.map((att, i) => (
            <ReferenceCard
              key={att.assetId}
              file={att}
              onUpdate={(updates) => updateAttachment(i, updates)}
              onRemove={() => removeAttachment(i)}
            />
          ))}
        </div>
      )}

      {/* @-mention hint */}
      {atHint && (
        <div className="max-w-3xl mx-auto mb-2">
          <p className="text-xs text-neutral-500">{atHint}</p>
        </div>
      )}

      <div className="flex items-end gap-2 max-w-3xl mx-auto">
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

        <VoiceRecorder onRecordingComplete={handleVoiceRecording} disabled={disabled} />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder={
              uploading
                ? "Uploading..."
                : "Describe what you want to create..."
            }
            rows={1}
            disabled={disabled || uploading}
            className="w-full resize-none bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 disabled:opacity-50"
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
