export interface Timeline {
  id: string;
  projectId: string;
  version: number;
  tracks: TimelineTracks;
  duration: number;
}

export interface TimelineTracks {
  video: VideoTrack[];
  audio: AudioTrack[];
}

export interface VideoTrack {
  id: string;
  label: string;
  clips: VideoClip[];
}

export interface VideoClip {
  id: string;
  assetId: string;
  startSec: number;
  endSec: number;
  trimStart: number;
  trimEnd: number;
  effects: ClipEffect[];
  transition: string;
}

export interface AudioTrack {
  id: string;
  label: string;
  kind: "dialogue" | "voiceover" | "music" | "ambience" | "foley" | "sfx";
  clips: AudioClip[];
}

export interface AudioClip {
  id: string;
  assetId: string;
  startSec: number;
  endSec: number;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
}

export interface ClipEffect {
  type: string;
  params: Record<string, unknown>;
}

export interface EditOperation {
  id: string;
  timelineId: string;
  type: "trim" | "split" | "reorder" | "overlay" | "delete" | "transition" | "volume" | "speed";
  payload: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}
