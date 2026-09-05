import type { SocialAdapter, AuthResult, AssetInfo, ValidationResult, PublishRequest, PublishResult, PublishStatus, MetricSnapshot } from "./platform-adapter";

export class InstagramAdapter implements SocialAdapter {
  platform = "instagram";

  async connect(): Promise<AuthResult> {
    return { success: false, error: "Instagram OAuth not yet configured. Connect via Settings." };
  }

  async validateAsset(asset: AssetInfo): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!["image/jpeg", "image/png", "video/mp4"].includes(asset.mimeType)) {
      errors.push("Instagram supports JPEG, PNG, and MP4 only");
    }
    if (asset.duration && asset.duration > 60) {
      warnings.push("Instagram Reels max duration is 60s. Video will be trimmed.");
    }
    if (asset.width && asset.height) {
      const ratio = asset.width / asset.height;
      if (ratio > 1.1) warnings.push("Instagram recommends 4:5 or 9:16 for feed/Reels");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async publish(_input: PublishRequest): Promise<PublishResult> {
    return { success: false, error: "Instagram publishing not yet enabled. Coming soon." };
  }

  async getStatus(_id: string): Promise<PublishStatus> {
    return { postId: _id, status: "failed", error: "Not implemented" };
  }

  async fetchMetrics(_id: string): Promise<MetricSnapshot> {
    return { postId: _id, capturedAt: new Date().toISOString(), views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  }
}
