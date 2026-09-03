"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPreviewCardProps {
  name: string;
  url: string;
  mimeType: string;
  size?: number;
  onRemove?: () => void;
}

export function MediaPreviewCard({ name, url, mimeType, size, onRemove }: MediaPreviewCardProps) {
  const isVideo = mimeType.startsWith("video/");
  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="relative inline-block rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden max-w-xs">
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="absolute top-1 right-1 h-6 w-6 z-10 bg-black/50 hover:bg-red-500/80"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {isImage && (
        <img src={url} alt={name} className="w-full h-40 object-cover" />
      )}

      {isVideo && (
        <video src={url} className="w-full h-40 object-cover" controls preload="metadata" />
      )}

      {isAudio && (
        <div className="p-4 flex items-center justify-center h-24">
          <audio src={url} controls preload="metadata" className="w-full" />
        </div>
      )}

      {!isImage && !isVideo && !isAudio && (
        <div className="p-4 flex items-center justify-center h-24 text-neutral-500 text-sm">
          File attached
        </div>
      )}

      <div className="px-3 py-2 border-t border-neutral-800">
        <p className="text-xs text-neutral-400 truncate">{name}</p>
        {size && <p className="text-xs text-neutral-600">{formatSize(size)}</p>}
      </div>
    </div>
  );
}
