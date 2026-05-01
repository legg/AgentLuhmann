import type { Context } from "hono";
import type { Env } from "../auth/index.js";

export async function handleSimilarity(c: Context): Promise<Response> {
  const env = c.env as Env;
  const userId = c.get("userId") as string;

  const body = await c.req.json<{ content: string }>();
  if (!body.content) {
    return c.json({ error: "Missing content" }, 400);
  }

  // Get embedding
  const embeddingResult = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: body.content,
  });
  const embedding: number[] = (embeddingResult as any).data[0];

  // Query DO
  const id = env.VECTOR_STORE.idFromName(userId);
  const store = env.VECTOR_STORE.get(id);
  const scores = await store.scoreSimilarity(embedding);
  const topNotes = await store.searchSimilar(embedding, 5);

  return c.json({
    ...scores,
    topNotes: topNotes.map((n) => ({
      id: n.id,
      path: n.vault_path,
      score: (n as any).score,
    })),
  });
}
