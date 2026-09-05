import { db } from "@/db";
import {
  brands,
  tasteReferences,
  entities,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateEmbedding } from "./embeddings";
import { hybridSearch } from "./retrieval";

export async function compileContext(params: {
  brandId: string;
  projectName: string;
  query: string;
  apiKey: string;
}): Promise<string> {
  const { brandId, query, apiKey } = params;

  const embedding = await generateEmbedding(query, apiKey);

  const knowledge = await hybridSearch({
    brandId,
    query,
    embedding,
    topK: 8,
  });

  const brandRows = await db
    .select()
    .from(brands)
    .where(eq(brands.id, brandId))
    .limit(1);
  const brand = brandRows[0];

  const tasteRows = await db
    .select()
    .from(tasteReferences)
    .where(eq(tasteReferences.brandId, brandId));
  const taste = tasteRows.map((t) => ({
    ...t,
    roles: (Array.isArray(t.roles) ? t.roles : null) as string[] | null,
  }));

  const entityRows = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.brandId, brandId),
        eq(entities.status, "active"),
      ),
    );

  return buildContextPack(brand, knowledge, taste, entityRows);
}

export function buildContextPack(
  brand: {
    name: string;
    positioning: string | null;
    personality: string | null;
    toneOfVoice: string | null;
  } | undefined,
  knowledge: {
    title: string;
    textContent: string | null;
    sourceType: string;
    trustLevel: string;
  }[],
  taste: {
    url: string | null;
    roles: string[] | null;
    notes: string | null;
    preferenceWeight: number;
  }[],
  entities: {
    type: string;
    name: string;
    canonicalDescription: string | null;
  }[],
): string {
  const sections: string[] = [];

  if (brand) {
    sections.push(
      [
        `# Brand: ${brand.name}`,
        brand.positioning ? `Positioning: ${brand.positioning}` : "",
        brand.personality ? `Personality: ${brand.personality}` : "",
        brand.toneOfVoice ? `Tone of Voice: ${brand.toneOfVoice}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (knowledge.length > 0) {
    const items = knowledge
      .map((k) =>
        [
          `### [${k.sourceType}] ${k.title}`,
          k.textContent ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
    sections.push(`# Knowledge Base\n${items}`);
  }

  if (taste.length > 0) {
    const refs = taste
      .map(
        (t) =>
          `- ${t.roles?.join(", ") ?? "general"}: ${t.notes ?? t.url ?? "no details"}`,
      )
      .join("\n");
    sections.push(`# Taste References\n${refs}`);
  }

  if (entities.length > 0) {
    const list = entities
      .map(
        (e) =>
          `- **${e.name}** (${e.type}): ${e.canonicalDescription ?? "no description"}`,
      )
      .join("\n");
    sections.push(`# Entities\n${list}`);
  }

  return sections.join("\n\n---\n\n");
}
