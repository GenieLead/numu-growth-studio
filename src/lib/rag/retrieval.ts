import { db } from "@/db";
import { knowledgeItems } from "@/db/schema";
import { sql } from "drizzle-orm";

  type KnowledgeItem = Omit<typeof knowledgeItems.$inferSelect, "embedding">;

export async function hybridSearch(params: {
  brandId: string;
  query: string;
  embedding: number[];
  topK?: number;
}): Promise<KnowledgeItem[]> {
  const { brandId, query, embedding, topK = 10 } = params;

  const vectorLiteral = `[${embedding.join(",")}]`;

  const vectorResults = await db.execute(sql`
    SELECT
      id,
      brand_id,
      source_type,
      title,
      raw_asset_id,
      text_content,
      trust_level,
      metadata,
      deleted_at,
      created_at,
      1 - (embedding <=> ${vectorLiteral}::vector) AS vector_score
    FROM knowledge_items
    WHERE brand_id = ${brandId}
      AND deleted_at IS NULL
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK * 2}
  `);

  const ftsResults = await db.execute(sql`
    SELECT
      id,
      brand_id,
      source_type,
      title,
      raw_asset_id,
      text_content,
      trust_level,
      metadata,
      deleted_at,
      created_at,
      ts_rank(
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(text_content, '')),
        plainto_tsquery('english', ${query})
      ) AS fts_score
    FROM knowledge_items
    WHERE brand_id = ${brandId}
      AND deleted_at IS NULL
      AND (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(text_content, ''))
        @@ plainto_tsquery('english', ${query})
      )
    ORDER BY fts_score DESC
    LIMIT ${topK * 2}
  `);

  const scores = new Map<
    string,
    { item: KnowledgeItem; vectorScore: number; ftsScore: number }
  >();

  for (const row of vectorResults.rows) {
    const id = row.id as string;
    scores.set(id, {
      item: {
        id: row.id as string,
        brandId: row.brand_id as string,
        sourceType: row.source_type as string,
        title: row.title as string,
        rawAssetId: row.raw_asset_id as string | null,
        textContent: row.text_content as string | null,
        trustLevel: row.trust_level as string,
        metadata: row.metadata as Record<string, unknown> | null,
        deletedAt: row.deleted_at as Date | null,
        createdAt: row.created_at as Date,
      },
      vectorScore: (row.vector_score as number) ?? 0,
      ftsScore: 0,
    });
  }

  for (const row of ftsResults.rows) {
    const id = row.id as string;
    const existing = scores.get(id);
    if (existing) {
      existing.ftsScore = (row.fts_score as number) ?? 0;
    } else {
      scores.set(id, {
        item: {
          id: row.id as string,
          brandId: row.brand_id as string,
          sourceType: row.source_type as string,
          title: row.title as string,
          rawAssetId: row.raw_asset_id as string | null,
          textContent: row.text_content as string | null,
          trustLevel: row.trust_level as string,
          metadata: row.metadata as Record<string, unknown> | null,
          deletedAt: row.deleted_at as Date | null,
          createdAt: row.created_at as Date,
        },
        vectorScore: 0,
        ftsScore: (row.fts_score as number) ?? 0,
      });
    }
  }

  const scored = Array.from(scores.values()).map((entry) => ({
    ...entry,
    rrfScore:
      entry.vectorScore > 0
        ? 1 / (60 + entry.vectorScore)
        : 0 +
          (entry.ftsScore > 0 ? 1 / (60 + entry.ftsScore) : 0),
  }));

  scored.sort((a, b) => b.rrfScore - a.rrfScore);

  return scored.slice(0, topK).map((s) => s.item);
}
