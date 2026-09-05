import { getOpenRouterKey } from "@/lib/openrouter";

export interface ImageGenParams {
  prompt: string;
  referenceUrls?: string[];
  aspectRatio?: string;
  style?: string;
}

export interface ImageGenResult {
  imageUrl: string;
  model: string;
  cost?: number;
}

export async function generateImage(userId: string, params: ImageGenParams): Promise<ImageGenResult> {
  const apiKey = await getOpenRouterKey(userId);
  if (!apiKey) throw new Error("OpenRouter key not connected");

  const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
  
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  content.push({ type: "text", text: params.prompt });
  
  if (params.referenceUrls) {
    for (const url of params.referenceUrls) {
      content.push({ type: "image_url", image_url: { url } });
    }
  }

  messages.push({ role: "user", content });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "HAYK Director",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-preview-image-generation",
      messages,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content || "";
  
  const base64Match = text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
  if (base64Match) {
    return { imageUrl: base64Match[0], model: data.model || "gemini-2.5-flash" };
  }
  
  const urlMatch = text.match(/https?:\/\/[^\s"]+\.(png|jpg|jpeg|webp)/i);
  if (urlMatch) {
    return { imageUrl: urlMatch[0], model: data.model || "gemini-2.5-flash" };
  }

  return { imageUrl: "", model: data.model || "gemini-2.5-flash" };
}
