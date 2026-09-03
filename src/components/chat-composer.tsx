"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip } from "lucide-react";
import { ReferenceCard, type UploadedFile, type ReferenceKind } from "@/components/reference-card";
import { VoiceInput } from "@/components/voice-input";

interface ChatComposerProps {
  onSend: (message: string, attachments?: UploadedFile[]) => void;
  disabled?: boolean;
  projectId?: string;
  initialAttach?: { assetId: string; url: string; name: string; mimeType: string; kind: string; multi?: { assetId: string; url: string; name: string; mimeType: string; kind: string }[] } | null;
}

export function ChatComposer({ onSend, disabled, projectId, initialAttach }: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [atFilter, setAtFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-attach asset(s) from URL (e.g., "Use in Project" from library)
  useEffect(() => {
    if (initialAttach && attachments.length === 0) {
      const items = initialAttach.multi || [initialAttach];
      setAttachments(items.map((a) => ({
        assetId: a.assetId,
        url: a.url,
        name: a.name,
        mimeType: a.mimeType,
        size: 0,
        kind: a.kind as ReferenceKind,
        customName: "",
      })));
      window.history.replaceState({}, "", `/projects/${projectId}`);
    }
  }, [initialAttach]);

  const namedRefs = attachments.filter((a) => a.customName);

  // @-mention detection
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch && namedRefs.length > 0) {
      setShowAtMenu(true);
      setAtFilter(atMatch[1].toLowerCase());
    } else {
      setShowAtMenu(false);
    }
  }, [message, namedRefs.length]);

  const insertAtMention = (name: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const textAfterCursor = message.slice(cursorPos);
    const newBefore = textBeforeCursor.replace(/@\w*$/, `@${name} `);
    setMessage(newBefore + textAfterCursor);
    setShowAtMenu(false);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = newBefore.length;
      el.focus();
    }, 0);
  };

  const handleSubmit = () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return;
    onSend(message.trim() || "Here are my references", attachments.length > 0 ? attachments : undefined);
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showAtMenu) {
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

  const handleVoiceTranscript = (text: string) => {
    setMessage((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${text}` : text;
    });
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length && fileInputRef.current) {
      // Create a synthetic event
      const dt = new DataTransfer();
      for (const f of Array.from(files)) dt.items.add(f);
      fileInputRef.current.files = dt.files;
      handleFileSelect({ target: { files: dt.files } } as any);
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
      e.preventDefault();
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

  const updateAttachment = (index: number, updates: Partial<UploadedFile>) => {
    setAttachments((prev) => prev.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredRefs = namedRefs.filter((r) =>
    r.customName.toLowerCase().includes(atFilter)
  );

  return (
    <div
      className="border-t border-neutral-800 bg-neutral-950 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="max-w-3xl mx-auto mb-3 flex gap-2 overflow-x-auto pb-2">
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

      {/* @-mention menu */}
      {showAtMenu && filteredRefs.length > 0 && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-1 shadow-lg">
            {filteredRefs.map((ref) => (
              <button
                key={ref.assetId}
                onClick={() => insertAtMention(ref.customName)}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-left hover:bg-neutral-700 transition-colors"
              >
                <span className="text-accent-lime text-xs font-medium">@{ref.customName}</span>
                <span className="text-neutral-500 text-[10px]">{ref.kind}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
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

        <VoiceInput onTranscript={handleVoiceTranscript} disabled={disabled} />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder={uploading ? "Uploading..." : "Describe what you want to create..."}
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
