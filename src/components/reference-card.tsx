"use client";

import { useState, useRef } from "react";
import { X, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReferenceKind = "character" | "product" | "location" | "costume" | "prop" | "style" | "reference";

interface UploadedFile {
  assetId: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  kind: ReferenceKind;
  customName: string;
}

interface ReferenceCardProps {
  file: UploadedFile;
  onUpdate: (updates: Partial<UploadedFile>) => void;
  onRemove: () => void;
}

export function ReferenceCard({ file, onUpdate, onRemove }: ReferenceCardProps) {
  const [editingName, setEditingName] = useState(!file.customName);
  const [tempName, setTempName] = useState(file.customName);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const saveName = () => {
    onUpdate({ customName: tempName });
    setEditingName(false);
  };

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-800 overflow-hidden w-44 shrink-0 group">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 z-10 h-5 w-5 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3 text-white" />
      </button>

      {/* Preview */}
      <div className="relative">
        {isImage && (
          <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
        )}
        {isVideo && (
          <video src={file.url} className="w-full h-24 object-cover" muted playsInline />
        )}
        {!isImage && !isVideo && (
          <div className="w-full h-24 bg-neutral-900 flex items-center justify-center text-neutral-500 text-xs">
            File
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2 py-1.5 space-y-1.5">
        {/* Name: view or edit mode */}
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setTempName(file.customName); } }}
              placeholder="Name..."
              className="h-6 text-xs bg-neutral-900 border-neutral-600 px-2 flex-1"
              autoFocus
            />
            <button onClick={saveName} className="h-6 w-6 shrink-0 rounded bg-accent-lime flex items-center justify-center">
              <Check className="h-3 w-3 text-black" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group/name">
            <span className="text-xs text-neutral-200 truncate flex-1">{file.customName || file.name}</span>
            <button
              onClick={() => { setEditingName(true); setTempName(file.customName); }}
              className="h-5 w-5 shrink-0 rounded hover:bg-neutral-700 flex items-center justify-center opacity-0 group-hover/name:opacity-100 transition-opacity"
            >
              <Pencil className="h-2.5 w-2.5 text-neutral-400" />
            </button>
          </div>
        )}

        {/* Kind */}
        <Select value={file.kind} onValueChange={(v) => onUpdate({ kind: v as ReferenceKind })}>
          <SelectTrigger className="h-6 text-[10px] bg-neutral-900 border-neutral-700 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-700">
            <SelectItem value="character">Character</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="costume">Costume</SelectItem>
            <SelectItem value="prop">Prop</SelectItem>
            <SelectItem value="style">Style</SelectItem>
            <SelectItem value="reference">Reference</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-[10px] text-neutral-500 truncate">{formatSize(file.size)}</p>
      </div>
    </div>
  );
}

export type { UploadedFile };
