export interface VideoModel {
  id: string;
  name: string;
  provider: string;
  maxDuration: number;
  minDuration: number;
  resolutions: string[];
  aspectRatios: string[];
  supportsImages: boolean;
  supportsAudio: boolean;
  pricePerSecond: number;
  currency: string;
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "bytedance/seedance-1.0-pro",
    name: "Seedance 1.0 Pro",
    provider: "ByteDance",
    maxDuration: 10,
    minDuration: 2,
    resolutions: ["720p", "1080p"],
    aspectRatios: ["9:16", "16:9", "1:1"],
    supportsImages: true,
    supportsAudio: true,
    pricePerSecond: 0.10,
    currency: "USD",
  },
  {
    id: "bytedance/seedance-1.0-lite",
    name: "Seedance 1.0 Lite",
    provider: "ByteDance",
    maxDuration: 10,
    minDuration: 2,
    resolutions: ["720p"],
    aspectRatios: ["9:16", "16:9", "1:1"],
    supportsImages: true,
    supportsAudio: false,
    pricePerSecond: 0.05,
    currency: "USD",
  },
];

export function getModelById(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export function estimateCost(model: VideoModel, durationSec: number): number {
  return Math.ceil(durationSec * model.pricePerSecond * 100) / 100;
}

export function findBestModel(
  duration: number,
  needsImages: boolean,
  needsAudio: boolean,
  budget?: number
): VideoModel | null {
  const candidates = VIDEO_MODELS.filter(
    (m) =>
      duration >= m.minDuration &&
      duration <= m.maxDuration &&
      (!needsImages || m.supportsImages) &&
      (!needsAudio || m.supportsAudio)
  );

  if (candidates.length === 0) return null;

  // Sort by price (cheapest first)
  candidates.sort((a, b) => a.pricePerSecond - b.pricePerSecond);

  // If budget given, find cheapest that fits
  if (budget !== undefined) {
    for (const m of candidates) {
      if (estimateCost(m, duration) <= budget) return m;
    }
  }

  return candidates[0];
}
