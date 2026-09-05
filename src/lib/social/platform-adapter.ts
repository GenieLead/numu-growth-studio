export interface SocialAdapter {
  platform: string;
  connect(): Promise<AuthResult>;
  validateAsset(asset: AssetInfo): Promise<ValidationResult>;
  publish(input: PublishRequest): Promise<PublishResult>;
  getStatus(id: string): Promise<PublishStatus>;
  fetchMetrics(id: string): Promise<MetricSnapshot>;
}

export interface AuthResult {
  success: boolean;
  accountId?: string;
  accountName?: string;
  error?: string;
}

export interface AssetInfo {
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PublishRequest {
  accountId: string;
  assetUrl: string;
  caption: string;
  tags?: string[];
  scheduleAt?: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface PublishStatus {
  postId: string;
  status: "pending" | "processing" | "published" | "failed";
  url?: string;
  error?: string;
}

export interface MetricSnapshot {
  postId: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  completionRate?: number;
  averageWatchTime?: number;
}
