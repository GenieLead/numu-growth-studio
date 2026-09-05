export async function generateEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: text,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Embedding API error ${response.status}: ${body}`,
    );
  }

  const json = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  return json.data[0].embedding;
}

export function chunkText(
  text: string,
  maxChunkSize: number = 500,
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  const overlap = Math.floor(maxChunkSize * 0.15);
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxChunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlap;
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

export async function generateChunks(
  text: string,
  apiKey: string,
): Promise<{ text: string; embedding: number[] }[]> {
  const chunks = chunkText(text);
  const results = await Promise.all(
    chunks.map(async (chunk) => ({
      text: chunk,
      embedding: await generateEmbedding(chunk, apiKey),
    })),
  );
  return results;
}
