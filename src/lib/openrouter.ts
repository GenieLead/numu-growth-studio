import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DIRECTOR_SYSTEM_PROMPT } from "./director-prompt";

function decryptKey(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface DirectorResponse {
  text: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function getOpenRouterKey(userId: string): Promise<string | null> {
  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (settings.length === 0 || !settings[0].encryptedOpenrouterKey) return null;
  return decryptKey(settings[0].encryptedOpenrouterKey);
}

export async function callDirector(
  userId: string,
  messages: ChatMessage[]
): Promise<DirectorResponse> {
  const apiKey = await getOpenRouterKey(userId);
  if (!apiKey) throw new Error("OpenRouter key not connected");

  const systemMessage: ChatMessage = {
    role: "system",
    content: DIRECTOR_SYSTEM_PROMPT,
  };

  const allMessages = [systemMessage, ...messages];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "NUMU Director",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: allMessages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  return {
    text: choice?.message?.content || "",
    model: data.model || "google/gemini-2.5-flash",
    usage: data.usage,
  };
}

export async function analyzeImage(
  userId: string,
  imageUrl: string,
  prompt: string = "Describe this image in detail for a commercial production context: subject, composition, lighting, color, mood, camera angle, and any notable production elements."
): Promise<string> {
  const apiKey = await getOpenRouterKey(userId);
  if (!apiKey) throw new Error("OpenRouter key not connected");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "NUMU Director",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 512,
    }),
  });

  if (!res.ok) throw new Error(`Image analysis failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Video Generation (Seedance) ──────────────────────────────────

export interface VideoGenParams {
  model: string;
  prompt: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
  inputReferences?: Array<{ type: string; image_url: { url: string } }>;
  frameImages?: Array<{
    type: string;
    image_url: { url: string };
    frame_type: "first_frame" | "last_frame";
  }>;
}

export interface VideoGenResult {
  jobId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  videoUrl?: string;
  cost?: number;
  error?: string;
}

export async function submitVideoGeneration(
  apiKey: string,
  params: VideoGenParams
): Promise<{ jobId: string; pollingUrl: string }> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
  };
  if (params.duration) body.duration = params.duration;
  if (params.resolution) body.resolution = params.resolution;
  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
  if (params.generateAudio !== undefined) body.generate_audio = params.generateAudio;
  if (params.inputReferences) body.input_references = params.inputReferences;
  if (params.frameImages) body.frame_images = params.frameImages;

  const res = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter video error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return { jobId: data.id, pollingUrl: data.polling_url };
}

export async function pollVideoGeneration(
  apiKey: string,
  jobId: string
): Promise<VideoGenResult> {
  const res = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter poll error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return {
    jobId,
    status: data.status,
    videoUrl: data.unsigned_urls?.[0],
    cost: data.usage?.cost,
    error: data.error,
  };
}
