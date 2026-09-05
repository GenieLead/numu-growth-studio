export interface Brand {
  id: string;
  userId: string;
  name: string;
  positioning: string | null;
  personality: string | null;
  visualSystem: string | null;
  toneOfVoice: string | null;
  values: string | null;
  rules: {
    approvedClaims?: string[];
    forbiddenClaims?: string[];
    legalNotes?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface KnowledgeItem {
  id: string;
  brandId: string;
  sourceType: "document" | "url" | "upload";
  title: string;
  rawAssetId: string | null;
  textContent: string | null;
  trustLevel: "user" | "verified" | "system";
  metadata: Record<string, unknown> | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface TasteReference {
  id: string;
  brandId: string;
  assetId: string | null;
  url: string | null;
  roles: string[] | null;
  notes: string | null;
  preferenceWeight: number;
  createdAt: Date;
}
