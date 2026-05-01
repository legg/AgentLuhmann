import { DurableObject } from "cloudflare:workers";

export interface NoteRecord {
  id: string;
  vault_path: string;
  content: string;
  embedding: number[];
  created_at: string;
  updated_at: string;
}

export interface SyncPayload {
  notes: Array<{
    id: string;
    path: string;
    content: string;
    embedding: number[];
  }>;
}

export class VectorStore extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      await this.sql.exec(`
        CREATE TABLE IF NOT EXISTS zettels (
          id TEXT PRIMARY KEY,
          vault_path TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding BLOB NOT NULL,
          created_at TEXT,
          updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_zettels_path ON zettels(vault_path);
      `);
    });
  }

  async addNote(
    id: string,
    vaultPath: string,
    content: string,
    embedding: number[]
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.ctx.storage.sql`
      INSERT INTO zettels (id, vault_path, content, embedding, created_at, updated_at)
      VALUES (${id}, ${vaultPath}, ${content}, ${JSON.stringify(embedding)}, ${now}, ${now})
      ON CONFLICT(id) DO UPDATE SET
        vault_path = excluded.vault_path,
        content = excluded.content,
        embedding = excluded.embedding,
        updated_at = excluded.updated_at;
    `;
  }

  async removeNote(id: string): Promise<void> {
    await this.ctx.storage.sql`
      DELETE FROM zettels WHERE id = ${id};
    `;
  }

  async listNotes(): Promise<string[]> {
    const rows = await this.ctx.storage.sql`
      SELECT id FROM zettels;
    `;
    return rows.map((r: any) => r.id as string);
  }

  async searchSimilar(embedding: number[], topK = 5): Promise<NoteRecord[]> {
    const rows = await this.ctx.storage.sql`
      SELECT id, vault_path, content, embedding, created_at, updated_at FROM zettels;
    `;
    const scored = (rows as any[]).map((row) => {
      const storedEmbedding: number[] = JSON.parse(row.embedding);
      const score = cosineSimilarity(embedding, storedEmbedding);
      return {
        id: row.id as string,
        vault_path: row.vault_path as string,
        content: row.content as string,
        embedding: storedEmbedding,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        score,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async scoreSimilarity(embedding: number[]): Promise<{
    maxScore: number;
    avgScore: number;
    count: number;
  }> {
    const rows = await this.ctx.storage.sql`
      SELECT embedding FROM zettels;
    `;
    if (rows.length === 0) {
      return { maxScore: 0, avgScore: 0, count: 0 };
    }
    const scores = (rows as any[]).map((row) => {
      const storedEmbedding: number[] = JSON.parse(row.embedding);
      return cosineSimilarity(embedding, storedEmbedding);
    });
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { maxScore, avgScore, count: scores.length };
  }

  async syncNotes(
    notes: Array<{ id: string; path: string; content: string; embedding: number[] }>
  ): Promise<{ synced: number; removed: number }> {
    const now = new Date().toISOString();
    const incomingIds = new Set(notes.map((n) => n.id));

    // Upsert all incoming notes
    for (const note of notes) {
      await this.ctx.storage.sql`
        INSERT INTO zettels (id, vault_path, content, embedding, created_at, updated_at)
        VALUES (${note.id}, ${note.path}, ${note.content}, ${JSON.stringify(note.embedding)}, ${now}, ${now})
        ON CONFLICT(id) DO UPDATE SET
          vault_path = excluded.vault_path,
          content = excluded.content,
          embedding = excluded.embedding,
          updated_at = excluded.updated_at;
      `;
    }

    // Remove notes not in the incoming list
    const existingIds = await this.listNotes();
    const removedIds = existingIds.filter((id) => !incomingIds.has(id));
    for (const id of removedIds) {
      await this.removeNote(id);
    }

    return { synced: notes.length, removed: removedIds.length };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}
