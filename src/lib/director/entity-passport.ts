import { db } from "@/db";
import { entities, entityAssets, assets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { EntityPassport, EntityAssetReference, EntityRules } from "@/types/entity";

export async function getEntityPassport(entityId: string): Promise<EntityPassport | null> {
  const rows = await db
    .select({
      entityId: entities.id,
      brandId: entities.brandId,
      type: entities.type,
      name: entities.name,
      canonicalDescription: entities.canonicalDescription,
      rules: entities.rules,
      status: entities.status,
      assetId: entityAssets.assetId,
      role: entityAssets.role,
      approved: entityAssets.approved,
      blobUrl: assets.blobUrl,
      assetName: assets.name,
      mimeType: assets.mimeType,
    })
    .from(entities)
    .leftJoin(entityAssets, eq(entities.id, entityAssets.entityId))
    .leftJoin(assets, eq(entityAssets.assetId, assets.id))
    .where(eq(entities.id, entityId));

  if (rows.length === 0) return null;

  const first = rows[0];
  const assetRefs: EntityAssetReference[] = rows
    .filter((r) => r.assetId)
    .map((r) => ({
      assetId: r.assetId!,
      role: r.role || "reference",
      approved: r.approved ?? true,
      blobUrl: r.blobUrl || undefined,
      name: r.assetName || undefined,
      mimeType: r.mimeType || undefined,
    }));

  return {
    id: first.entityId,
    brandId: first.brandId,
    type: first.type as EntityPassport["type"],
    name: first.name,
    canonicalDescription: first.canonicalDescription,
    rules: first.rules as EntityRules | null,
    assets: assetRefs,
    status: first.status,
  };
}

export async function getBrandEntities(brandId: string, type?: string): Promise<EntityPassport[]> {
  const conditions = [eq(entities.brandId, brandId), eq(entities.status, "active")];
  if (type) conditions.push(eq(entities.type, type));

  const entityRows = await db.select().from(entities).where(and(...conditions));
  const passports: EntityPassport[] = [];

  for (const entity of entityRows) {
    const passport = await getEntityPassport(entity.id);
    if (passport) passports.push(passport);
  }

  return passports;
}

export function formatPassportForPrompt(passport: EntityPassport): string {
  const lines = [
    `${passport.type.toUpperCase()}: ${passport.name}`,
    `Description: ${passport.canonicalDescription || "Not specified"}`,
  ];

  if (passport.rules) {
    const rules = passport.rules as Record<string, unknown>;
    for (const [key, value] of Object.entries(rules)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: ${value.join(", ")}`);
      } else if (typeof value === "string") {
        lines.push(`${key}: ${value}`);
      }
    }
  }

  if (passport.assets.length > 0) {
    lines.push(`Reference images: ${passport.assets.length} available`);
  }

  return lines.join("\n");
}

export function formatAllPassportsForPrompt(passports: EntityPassport[]): string {
  if (passports.length === 0) return "";
  return `\n--- ENTITY PASSPORTS ---\n${passports.map(formatPassportForPrompt).join("\n\n")}`;
}
