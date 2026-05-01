import type { NoteRecord } from "../src/vector-store/index.js";

/**
 * Seed script for the VectorStore Durable Object.
 *
 * Usage:
 *   npx tsx scripts/seed-zettels.ts --user-id=<userId> --file=<path-to-zettels.json>
 *
 * The JSON file should contain an array of objects:
 *   { "id": "01_zettels/20250101-note.md", "path": "01_zettels/20250101-note.md", "content": "..." }
 */

interface ZettelInput {
  id: string;
  path: string;
  content: string;
}

function parseArgs(): { userId?: string; file?: string } {
  const args = process.argv.slice(2);
  const result: { userId?: string; file?: string } = {};
  for (const arg of args) {
    if (arg.startsWith("--user-id=")) result.userId = arg.slice("--user-id=".length);
    if (arg.startsWith("--file=")) result.file = arg.slice("--file=".length);
  }
  return result;
}

async function main() {
  const { userId, file } = parseArgs();
  if (!userId || !file) {
    console.error("Usage: npx tsx scripts/seed-zettels.ts --user-id=<userId> --file=<path-to-zettels.json>");
    process.exit(1);
  }

  const fs = await import("node:fs");
  const raw = fs.readFileSync(file, "utf-8");
  const zettels: ZettelInput[] = JSON.parse(raw);

  console.log(`Seeding ${zettels.length} zettels for user ${userId}...`);
  console.log("Note: This script requires Wrangler bindings. Use wrangler CLI or run inside the worker.");
  console.log("For local testing, use the worker dev server with the /api/vector-store/sync endpoint.");
  console.log(JSON.stringify({ userId, notes: zettels.length }, null, 2));
}

main().catch(console.error);
