import type { Context } from "hono";
import type { Env } from "../auth/index.js";

export async function handleSync(c: Context): Promise<Response> {
  const env = c.env as Env;
  const userId = c.get("userId") as string;

  const body = await c.req.json<{
    notes: Array<{ id: string; path: string; content: string }>;
  }>();
  if (!body.notes || !Array.isArray(body.notes)) {
    return c.json({ error: "Missing notes array" }, 400);
  }

  // Batch embed all notes
  const notesWithEmbeddings = [];
  for (const note of body.notes) {
    const embeddingResult = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: note.content,
    });
    const embedding: number[] = (embeddingResult as any).data[0];
    notesWithEmbeddings.push({
      id: note.id,
      path: note.path,
      content: note.content,
      embedding,
    });
  }

  // Sync to DO
  const id = env.VECTOR_STORE.idFromName(userId);
  const store = env.VECTOR_STORE.get(id);
  const result = await store.syncNotes(notesWithEmbeddings);

  return c.json(result);
}
