export interface EntityPassport {
  id: string;
  brandId: string;
  type: "character" | "product" | "location" | "costume" | "prop" | "voice" | "style";
  name: string;
  canonicalDescription: string | null;
  rules: EntityRules | null;
  assets: EntityAssetReference[];
  status: string;
}

export interface EntityAssetReference {
  assetId: string;
  role: string;
  approved: boolean;
  blobUrl?: string;
  name?: string;
  mimeType?: string;
}

export interface EntityRules {
  consistencyRules?: string[];
  approvedAngles?: string[];
  neverGenerate?: string[];
  colorPalette?: string[];
  dimensions?: string;
  [key: string]: unknown;
}

export interface ProductPassport extends EntityPassport {
  type: "product";
  dimensions?: string;
  material?: string;
  labelPlacement?: string;
  approvedColors?: string[];
}

export interface CharacterPassport extends EntityPassport {
  type: "character";
  faceDescription?: string;
  bodyDescription?: string;
  wardrobe?: string[];
  voiceId?: string;
}
