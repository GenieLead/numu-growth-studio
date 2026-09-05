import { db } from "@/db";
import { knowledgeItems } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

type KnowledgeItem = typeof knowledgeItems.$inferSelect;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function hybridSearch(params: {
  brandId: string;
  query: string;
  embedding: number[];
  topK?: number;
}): Promise<KnowledgeItem[]> {
  const { brandId, query, embedding, topK = 10 } = params;

  const allItems = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.brandId, brandId), eq(knowledgeItems.deletedAt, null as any)));

  const scored = allItems.map((item) => {
    const itemEmbedding = item.embedding as number[] | null;
    const vectorScore = itemEmbedding ? cosineSimilarity(embedding, itemEmbedding) : 0;

    const text = `${item.title || ""} ${item.textContent || ""}`.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    const matchCount = queryWords.filter((w) => text.includes(w)).length;
    const ftsScore = queryWords.length > 0 ? matchCount / queryWords.length : 0;

    return { item, vectorScore, ftsScore };
  });

  const withRRF = scored.map((entry) => ({
    ...entry,
    rrfScore:
      (entry.vectorScore > 0 ? 1 / (60 + entry.vectorScore) : 0) +
      (entry.ftsScore > 0 ? 1 / (60 + entry.ftsScore) : 0),
  }));

  withRRF.sort((a, b) => b.rrfScore - a.rrfScore);

  return withRRF.slice(0, topK).map((s) => s.item);
}
