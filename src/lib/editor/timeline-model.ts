import type { Timeline, TimelineTracks, VideoTrack, VideoClip, AudioClip } from "@/types/timeline";

export function createEmptyTimeline(projectId: string): Timeline {
  return {
    id: "",
    projectId,
    version: 1,
    duration: 0,
    tracks: {
      video: [{ id: "v1", label: "Primary", clips: [] }],
      audio: [
        { id: "a1", label: "Dialogue", kind: "dialogue", clips: [] },
        { id: "a2", label: "Voiceover", kind: "voiceover", clips: [] },
        { id: "a3", label: "Music", kind: "music", clips: [] },
        { id: "a4", label: "Ambience", kind: "ambience", clips: [] },
        { id: "a5", label: "Foley", kind: "foley", clips: [] },
        { id: "a6", label: "SFX", kind: "sfx", clips: [] },
      ],
    },
  };
}

export function applyTrim(clip: VideoClip, newStart: number, newEnd: number): VideoClip {
  const durationChange = newEnd - newStart;
  return {
    ...clip,
    startSec: newStart,
    endSec: newEnd,
    trimEnd: clip.trimEnd + (clip.endSec - newEnd),
  };
}

export function applySplit(clip: VideoClip, splitPoint: number): [VideoClip, VideoClip] {
  const firstClip: VideoClip = {
    ...clip,
    endSec: splitPoint,
    trimEnd: clip.trimEnd + (clip.endSec - splitPoint),
  };
  const secondClip: VideoClip = {
    ...clip,
    id: clip.id + "-split",
    startSec: splitPoint,
    trimStart: clip.trimStart + (splitPoint - clip.startSec),
  };
  return [firstClip, secondClip];
}

export function applyReorder(clips: VideoClip[], clipId: string, newIndex: number): VideoClip[] {
  const clipIndex = clips.findIndex((c) => c.id === clipId);
  if (clipIndex === -1) return clips;
  const clip = clips[clipIndex];
  const without = clips.filter((c) => c.id !== clipId);
  without.splice(newIndex, 0, clip);
  return recalculateTiming(without);
}

export function recalculateTiming(clips: VideoClip[]): VideoClip[] {
  let currentTime = 0;
  return clips.map((clip) => {
    const duration = clip.endSec - clip.startSec;
    const updated = { ...clip, startSec: currentTime };
    currentTime += duration;
    return { ...updated, endSec: currentTime };
  });
}

export function calculateTimelineDuration(tracks: TimelineTracks): number {
  let maxDuration = 0;
  for (const track of tracks.video) {
    for (const clip of track.clips) {
      if (clip.endSec > maxDuration) maxDuration = clip.endSec;
    }
  }
  return maxDuration;
}

export function formatTimelineSummary(tracks: TimelineTracks): string {
  const parts: string[] = [];
  for (const track of tracks.video) {
    if (track.clips.length > 0) {
      parts.push(`V: ${track.label} — ${track.clips.length} clips, ${track.clips[track.clips.length - 1]?.endSec || 0}s`);
    }
  }
  for (const track of tracks.audio) {
    if (track.clips.length > 0) {
      parts.push(`A: ${track.label} — ${track.clips.length} clips`);
    }
  }
  return parts.length > 0 ? parts.join("\n") : "Empty timeline";
}
