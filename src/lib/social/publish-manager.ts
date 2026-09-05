import { InstagramAdapter } from "./instagram-adapter";
import { TikTokAdapter } from "./tiktok-adapter";
import type { SocialAdapter, PublishRequest, PublishResult, ValidationResult } from "./platform-adapter";

const adapters: Record<string, SocialAdapter> = {
  instagram: new InstagramAdapter(),
  tiktok: new TikTokAdapter(),
};

export function getAdapter(platform: string): SocialAdapter | null {
  return adapters[platform] || null;
}

export function getSupportedPlatforms(): string[] {
  return Object.keys(adapters);
}

export async function validateForPlatform(platform: string, asset: { mimeType: string; duration?: number; width?: number; height?: number }): Promise<ValidationResult> {
  const adapter = getAdapter(platform);
  if (!adapter) return { valid: false, errors: [`Unknown platform: ${platform}`], warnings: [] };
  return adapter.validateAsset(asset);
}

export async function publishToPlatform(platform: string, request: PublishRequest): Promise<PublishResult> {
  const adapter = getAdapter(platform);
  if (!adapter) return { success: false, error: `Unknown platform: ${platform}` };
  return adapter.publish(request);
}
