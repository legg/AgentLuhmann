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
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS zettels (
          id TEXT PRIMARY KEY,
          vault_path TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding TEXT NOT NULL,
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
    this.ctx.storage.sql.exec(
      `INSERT INTO zettels (id, vault_path, content, embedding, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         vault_path = excluded.vault_path,
         content = excluded.content,
         embedding = excluded.embedding,
         updated_at = excluded.updated_at`,
      id, vaultPath, content, JSON.stringify(embedding), now, now
    );
  }

  async removeNote(id: string): Promise<void> {
    this.ctx.storage.sql.exec(`DELETE FROM zettels WHERE id = ?`, id);
  }

  async listNotes(): Promise<string[]> {
    const cursor = this.ctx.storage.sql.exec<{ id: string }>(
      `SELECT id FROM zettels`
    );
    return cursor.toArray().map((r) => r.id);
  }

  async searchSimilar(embedding: number[], topK = 5): Promise<(NoteRecord & { score: number })[]> {
    const cursor = this.ctx.storage.sql.exec<{
      id: string;
      vault_path: string;
      content: string;
      embedding: string;
      created_at: string;
      updated_at: string;
    }>(`SELECT id, vault_path, content, embedding, created_at, updated_at FROM zettels`);

    const scored = cursor.toArray().map((row) => {
      const storedEmbedding: number[] = JSON.parse(row.embedding);
      const score = cosineSimilarity(embedding, storedEmbedding);
      return {
        id: row.id,
        vault_path: row.vault_path,
        content: row.content,
        embedding: storedEmbedding,
        created_at: row.created_at,
        updated_at: row.updated_at,
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
    const cursor = this.ctx.storage.sql.exec<{ embedding: string }>(
      `SELECT embedding FROM zettels`
    );
    const rows = cursor.toArray();

    if (rows.length === 0) {
      return { maxScore: 0, avgScore: 0, count: 0 };
    }

    const scores = rows.map((row) => {
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

    for (const note of notes) {
      this.ctx.storage.sql.exec(
        `INSERT INTO zettels (id, vault_path, content, embedding, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           vault_path = excluded.vault_path,
           content = excluded.content,
           embedding = excluded.embedding,
           updated_at = excluded.updated_at`,
        note.id, note.path, note.content, JSON.stringify(note.embedding), now, now
      );
    }

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
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}
