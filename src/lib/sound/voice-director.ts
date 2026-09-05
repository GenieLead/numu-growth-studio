import { getOpenRouterKey } from "@/lib/openrouter";

export interface VoiceGenParams {
  text: string;
  voice?: string;
  language?: string;
  emotion?: string;
}

export interface VoiceGenResult {
  audioUrl: string;
  duration: number;
  model: string;
}

export async function generateVoice(userId: string, params: VoiceGenParams): Promise<VoiceGenResult> {
  const apiKey = await getOpenRouterKey(userId);
  if (!apiKey) throw new Error("OpenRouter key not connected");

  const prompt = `Generate a voiceover for the following text. Tone: ${params.emotion || "neutral"}. Language: ${params.language || "English"}. The voice should be clear, professional, and suitable for a commercial production.\n\nText: "${params.text}"`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "HAYK Sound",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 256,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Voice generation failed: ${res.status}`);
  const data = await res.json();

  return {
    audioUrl: "",
    duration: params.text.length / 15,
    model: data.model || "tts",
  };
}

export function buildVoiceoverPrompt(params: {
  script: string;
  tone: string;
  duration: number;
  platform: string;
}): string {
  const wordsPerSec = params.platform === "tiktok" ? 3.5 : 2.5;
  const targetWords = Math.round(params.duration * wordsPerSec);
  const script = params.script;
  const currentWords = script.split(/\s+/).length;
  
  if (currentWords > targetWords * 1.2) {
    return `[Script is ${currentWords} words, target is ~${targetWords} for ${params.duration}s. Trim to fit.]`;
  }
  if (currentWords < targetWords * 0.6) {
    return `[Script is only ${currentWords} words, need ~${targetWords} for ${params.duration}s. Expand or slow down.]`;
  }
  return "";
}
