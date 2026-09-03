"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
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
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 overflow-hidden w-64 shrink-0">
      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="absolute top-1 right-1 h-6 w-6 z-10 bg-black/60 hover:bg-red-500/80 rounded-full"
      >
        <X className="h-3 w-3 text-white" />
      </Button>

      {/* Preview */}
      {isImage && (
        <img src={file.url} alt={file.name} className="w-full h-36 object-cover" />
      )}
      {isVideo && (
        <video src={file.url} className="w-full h-36 object-cover" muted playsInline />
      )}
      {!isImage && !isVideo && (
        <div className="w-full h-36 bg-neutral-800 flex items-center justify-center text-neutral-500 text-xs">
          File
        </div>
      )}

      {/* Controls */}
      <div className="p-2 space-y-2">
        {/* Name input */}
        <Input
          value={file.customName}
          onChange={(e) => onUpdate({ customName: e.target.value })}
          placeholder="Name this reference..."
          className="h-7 text-xs bg-neutral-800 border-neutral-700 px-2"
        />

        {/* Kind selector */}
        <Select value={file.kind} onValueChange={(v) => onUpdate({ kind: v as ReferenceKind })}>
          <SelectTrigger className="h-7 text-xs bg-neutral-800 border-neutral-700">
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

        {/* File info */}
        <p className="text-[10px] text-neutral-500 truncate">{file.name} · {formatSize(file.size)}</p>
      </div>
    </div>
  );
}

export type { UploadedFile };
