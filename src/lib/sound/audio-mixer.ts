export interface AudioMixTrack {
  kind: "dialogue" | "voiceover" | "music" | "ambience" | "foley" | "sfx";
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  duckUnder?: string;
}

export interface MixSettings {
  masterVolume: number;
  normalize: boolean;
  targetLoudness: number; // LUFS
  tracks: AudioMixTrack[];
}

export const DEFAULT_MIX_SETTINGS: MixSettings = {
  masterVolume: 1.0,
  normalize: true,
  targetLoudness: -14,
  tracks: [
    { kind: "dialogue", volume: 1.0, fadeInMs: 0, fadeOutMs: 0 },
    { kind: "voiceover", volume: 0.9, fadeInMs: 100, fadeOutMs: 200 },
    { kind: "music", volume: 0.4, fadeInMs: 500, fadeOutMs: 1000, duckUnder: "dialogue" },
    { kind: "ambience", volume: 0.3, fadeInMs: 1000, fadeOutMs: 2000 },
    { kind: "foley", volume: 0.5, fadeInMs: 0, fadeOutMs: 0 },
    { kind: "sfx", volume: 0.6, fadeInMs: 0, fadeOutMs: 0 },
  ],
};

export function buildMixPlan(settings: MixSettings): string {
  const lines: string[] = [];
  lines.push("AUDIO MIX PLAN");
  lines.push(`Master: ${settings.masterVolume}, Normalize: ${settings.normalize}, Target: ${settings.targetLoudness} LUFS`);
  for (const track of settings.tracks) {
    const duck = track.duckUnder ? ` (duck under ${track.duckUnder})` : "";
    lines.push(`  ${track.kind}: vol=${track.volume}, fade in=${track.fadeInMs}ms, fade out=${track.fadeOutMs}ms${duck}`);
  }
  return lines.join("\n");
}
