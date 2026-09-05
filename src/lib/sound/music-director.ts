export interface MusicGenParams {
  mood: string;
  genre?: string;
  duration: number;
  bpm?: number;
  instrumentation?: string[];
}

export interface MusicGenResult {
  audioUrl: string;
  duration: number;
}

export async function generateMusicPrompt(params: MusicGenParams): Promise<string> {
  const parts: string[] = [];
  parts.push(`${params.mood} ${params.genre || "ambient"} music`);
  parts.push(`${params.duration} seconds`);
  if (params.bpm) parts.push(`${params.bpm} BPM`);
  if (params.instrumentation?.length) parts.push(`featuring ${params.instrumentation.join(", ")}`);
  parts.push("professional production, no vocals");
  return parts.join(". ");
}

export function buildMusicCue(params: {
  sceneType: string;
  mood: string;
  duration: number;
  hasVoiceover: boolean;
}): string {
  const lines: string[] = [];
  lines.push(`Scene: ${params.sceneType}`);
  lines.push(`Mood: ${params.mood}`);
  lines.push(`Duration: ${params.duration}s`);
  if (params.hasVoiceover) {
    lines.push("Duck music under voiceover. Start music 0.5s before VO. Fade out 1s after VO ends.");
  }
  return lines.join("\n");
}
