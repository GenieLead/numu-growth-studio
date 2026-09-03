import { getOpenRouterKey } from "./openrouter";

export interface VideoModel {
  id: string;
  name: string;
  provider: string;
  maxDuration?: number;
  minDuration?: number;
  pricePerSecond?: number;
  currency: string;
  capabilities: string[];
}

// Cache for models (refresh every hour)
let modelsCache: VideoModel[] = [];
let lastFetch = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function fetchVideoModels(userId: string): Promise<VideoModel[]> {
  const now = Date.now();
  if (modelsCache.length > 0 && now - lastFetch < CACHE_TTL) {
    return modelsCache;
  }

  const apiKey = await getOpenRouterKey(userId);
  if (!apiKey) return [];

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const models = data.data || [];

    // Filter for video models
    modelsCache = models
      .filter((m: any) => {
        const id = m.id.toLowerCase();
        return id.includes("video") || id.includes("seedance") || id.includes("kling") || id.includes("sora") || id.includes("runway") || id.includes("pika");
      })
      .map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        provider: m.id.split("/")[0] || "unknown",
        pricePerSecond: m.pricing?.prompt ? parseFloat(m.pricing.prompt) : undefined,
        currency: "USD",
        capabilities: [],
      }));

    lastFetch = now;
    return modelsCache;
  } catch {
    return modelsCache;
  }
}

export function getModelById(models: VideoModel[], id: string): VideoModel | undefined {
  return models.find((m) => m.id === id);
}

export function estimateCost(model: VideoModel, durationSec: number): number {
  if (!model.pricePerSecond) return 0;
  return Math.ceil(durationSec * model.pricePerSecond * 100) / 100;
}

export function findBestModel(
  models: VideoModel[],
  duration: number,
  budget?: number
): VideoModel | null {
  const candidates = models.filter((m) => {
    if (m.maxDuration && duration > m.maxDuration) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Sort by price if available
  candidates.sort((a, b) => (a.pricePerSecond || 0) - (b.pricePerSecond || 0));

  if (budget !== undefined) {
    for (const m of candidates) {
      if (!m.pricePerSecond || estimateCost(m, duration) <= budget) return m;
    }
  }

  return candidates[0];
}
