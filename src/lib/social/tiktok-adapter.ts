import type { SocialAdapter, AuthResult, AssetInfo, ValidationResult, PublishRequest, PublishResult, PublishStatus, MetricSnapshot } from "./platform-adapter";

export class TikTokAdapter implements SocialAdapter {
  platform = "tiktok";

  async connect(): Promise<AuthResult> {
    return { success: false, error: "TikTok OAuth not yet configured. Connect via Settings." };
  }

  async validateAsset(asset: AssetInfo): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (asset.mimeType !== "video/mp4") {
      errors.push("TikTok supports MP4 video only");
    }
    if (asset.duration && asset.duration > 180) {
      warnings.push("TikTok max duration is 3 minutes. Video will be trimmed.");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async publish(_input: PublishRequest): Promise<PublishResult> {
    return { success: false, error: "TikTok publishing not yet enabled. Coming soon." };
  }

  async getStatus(_id: string): Promise<PublishStatus> {
    return { postId: _id, status: "failed", error: "Not implemented" };
  }

  async fetchMetrics(_id: string): Promise<MetricSnapshot> {
    return { postId: _id, capturedAt: new Date().toISOString(), views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  }
}
