"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface VideoTrimmerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  videoName: string;
  maxDuration: number;
  onSave: (startSec: number, endSec: number) => void;
}

export function VideoTrimmer({ open, onOpenChange, videoUrl, videoName, maxDuration, onSave }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoUrl, open]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(Math.min(dur, maxDuration));
      setTrimStart(0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        setPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.currentTime = trimStart;
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    videoRef.current.currentTime = Math.max(trimStart, Math.min(trimEnd, time));
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging("start");
  };

  const handleDragEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging("end");
  };

  useEffect(() => {
    if (!dragging || !timelineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = timelineRef.current!.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pos * duration;

      if (dragging === "start") {
        setTrimStart(Math.min(time, trimEnd - 1));
      } else {
        setTrimEnd(Math.max(time, trimStart + 1));
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, duration, trimStart, trimEnd]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const trimDuration = trimEnd - trimStart;
  const startPercent = (trimStart / duration) * 100;
  const endPercent = (trimEnd / duration) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-base">Trim video</DialogTitle>
          <p className="text-xs text-neutral-500">Choose the segment you want to use (max {maxDuration}s)</p>
        </DialogHeader>

        {/* Video preview */}
        <div className="px-6">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              playsInline
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8 shrink-0">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="flex-1 relative" ref={timelineRef} onClick={handleTimelineClick}>
              {/* Track background */}
              <div className="h-10 bg-neutral-800 rounded relative overflow-hidden cursor-pointer">
                {/* Selected range */}
                <div
                  className="absolute top-0 bottom-0 bg-accent-lime/20 border-y-2 border-accent-lime"
                  style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                />
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
                {/* Trim handles */}
                <div
                  className="absolute top-0 bottom-0 w-3 bg-accent-lime cursor-ew-resize hover:bg-accent-lime/80 z-20 flex items-center justify-center"
                  style={{ left: `calc(${startPercent}% - 6px)` }}
                  onMouseDown={handleDragStart}
                >
                  <div className="w-0.5 h-4 bg-black/40 rounded" />
                </div>
                <div
                  className="absolute top-0 bottom-0 w-3 bg-accent-lime cursor-ew-resize hover:bg-accent-lime/80 z-20 flex items-center justify-center"
                  style={{ left: `calc(${endPercent}% - 6px)` }}
                  onMouseDown={handleDragEnd}
                >
                  <div className="w-0.5 h-4 bg-black/40 rounded" />
                </div>
              </div>
            </div>

            <span className="text-xs text-neutral-400 tabular-nums w-12 text-right">{formatTime(trimDuration)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-neutral-700">
            Cancel
          </Button>
          <Button onClick={() => { onSave(trimStart, trimEnd); onOpenChange(false); }} className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
