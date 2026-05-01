import type { Context } from "hono";
import type { Env } from "../auth/index.js";

export async function handleCapture(c: Context): Promise<Response> {
  const env = c.env as Env;
  const userId = c.get("userId") as string;

  const body = await c.req.json<{ content: string }>();
  if (!body.content) {
    return c.json({ error: "Missing content" }, 400);
  }

  // 1. LLM rewrite via Workers AI
  const llmResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that rewrites notes into clear, structured Zettelkasten-style notes. Output JSON with fields: title (string), keywords (string[]), rewrittenContent (string).",
      },
      {
        role: "user",
        content: body.content,
      },
    ],
  });

  // Parse LLM output (attempt robust JSON parsing)
  let title = "";
  let keywords: string[] = [];
  let rewrittenContent = "";

  try {
    const raw = (llmResult as any).response || "";
    // Try to extract JSON block
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    title = parsed.title || "";
    keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    rewrittenContent = parsed.rewrittenContent || raw;
  } catch {
    // Fallback: use raw response as rewritten content
    rewrittenContent = (llmResult as any).response || body.content;
  }

  // 2. Get embedding via Workers AI
  const embeddingResult = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: body.content,
  });
  const embedding: number[] = (embeddingResult as any).data[0];

  // 3. Query VectorStore DO for similarity
  const id = env.VECTOR_STORE.idFromName(userId);
  const store = env.VECTOR_STORE.get(id);
  const similarityResult = await store.scoreSimilarity(embedding);
  const similarityScore = similarityResult.maxScore;
  const topNotes = await store.searchSimilar(embedding, 5);

  return c.json({
    rewrittenContent,
    title,
    keywords,
    similarityScore,
    similarNotes: topNotes.map((n) => ({
      id: n.id,
      path: n.vault_path,
      score: (n as any).score,
    })),
  });
}
