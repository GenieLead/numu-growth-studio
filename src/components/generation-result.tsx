"use client";

import { Film, Clock, DollarSign, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GenerationResultProps {
  status: "submitted" | "processing" | "completed" | "failed";
  videoUrl?: string;
  model?: string;
  duration?: number;
  estimatedCost?: number;
  actualCost?: number;
  errorMessage?: string;
  onRetry?: () => void;
}

export function GenerationResult({
  status,
  videoUrl,
  model,
  duration,
  estimatedCost,
  actualCost,
  errorMessage,
  onRetry,
}: GenerationResultProps) {
  if (status === "submitted" || status === "processing") {
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-accent-lime/20 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-accent-lime animate-spin" />
          </div>
          <div>
            <p className="text-sm font-medium">Generating video...</p>
            <p className="text-xs text-neutral-500">{model} · {duration}s</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{Math.ceil((duration || 10) * 2)}s remaining</span>
          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{estimatedCost?.toFixed(2)} credits</span>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm font-medium text-red-400">Generation failed</p>
        </div>
        <p className="text-xs text-neutral-400 mb-3">{errorMessage || "Unknown error"}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="border-red-500/30 text-red-400">
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 overflow-hidden max-w-md">
      {videoUrl && (
        <video
          src={videoUrl}
          className="w-full aspect-video object-cover"
          controls
          playsInline
        />
      )}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300">
            <Check className="h-3 w-3 mr-1" /> Complete
          </Badge>
          <span>{model}</span>
          <span>{duration}s</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {actualCost?.toFixed(2) || estimatedCost?.toFixed(2)} credits
          </span>
        </div>
      </div>
    </div>
  );
}
