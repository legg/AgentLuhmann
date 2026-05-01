# AgentLuhmann API

Cloudflare Worker backend for AI-powered capture and vector-store-based similarity scoring in the AgentLuhmann Obsidian plugin.

## Architecture

```
Obsidian Plugin (AgentLuhmann)
  │
  │  HTTPS (requestUrl)
  │  Authorization: Bearer <api-key>
  ▼
Cloudflare Worker (agent-luhmann-api)
  ├── /api/auth/*    → Better Auth (D1 SQLite)
  ├── /api/capture   → Workers AI LLM + embedding + similarity
  ├── /api/similarity→ Embedding + similarity score
  └── /api/vector-store/sync → Bulk sync to VectorStore DO

Cloudflare D1 (agent-luhmann-db)
  └── Better Auth tables (users, sessions, api_keys, ...)

Cloudflare Durable Object (VectorStore)
  └── Per-user SQLite (zettels table with embeddings)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated
- A Cloudflare account with Workers AI enabled

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the D1 database

```bash
npx wrangler d1 create agent-luhmann-db
```

Copy the returned `database_id` into `wrangler.jsonc` under `d1_databases[0].database_id`.

### 3. Set secrets

```bash
npx wrangler secret put $BETTER_AUTH_SECRET
```

Enter a strong random secret (32+ characters). Generate one with:

```bash
openssl rand -base64 32
```

### 4. Generate Better Auth schema

```bash
npm run auth:generate
```

This creates/updates `src/auth/schema.ts`.

### 5. Apply D1 migrations

```bash
# Local
npx wrangler d1 migrations create agent-luhmann-db init
# Copy the generated SQL from src/auth/schema.ts into migrations/0001_init.sql
npm run db:migrate:local

# Remote (production)
npm run db:migrate:remote
```

### 6. Deploy the Worker

```bash
npm run deploy
```

After deployment, Wrangler prints your Worker URL (e.g. `https://agent-luhmann-api.YOUR_SUBDOMAIN.workers.dev`).

Update `wrangler.jsonc`:

```jsonc
"vars": {
  "BETTER_AUTH_URL": "https://agent-luhmann-api.YOUR_SUBDOMAIN.workers.dev"
}
```

Then re-deploy:

```bash
npm run deploy
```

## Running Locally

```bash
npm run dev
```

This starts the Wrangler dev server (usually on `http://localhost:8787`).

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST | `/api/auth/*` | No | Better Auth endpoints (sign up, sign in, API key management) |
| POST | `/api/capture` | Bearer API key | LLM rewrite + embedding + similarity |
| POST | `/api/similarity` | Bearer API key | Embedding + similarity score only |
| POST | `/api/vector-store/sync` | Bearer API key | Bulk sync notes to vector store |

## Project Structure

```
agent-luhmann-api/
├── src/
│   ├── index.ts              ← Worker entry + Hono router
│   ├── auth/
│   │   ├── index.ts          ← Better Auth runtime factory
│   │   ├── cli-config.ts     ← Static config for schema generation
│   │   └── schema.ts         ← Generated auth schema
│   ├── vector-store/
│   │   ├── index.ts          ← VectorStore DO class
│   │   └── utils.ts          ← Cosine similarity helper
│   ├── routes/
│   │   ├── capture.ts        ← POST /api/capture
│   │   ├── similarity.ts     ← POST /api/similarity
│   │   └── sync.ts           ← POST /api/vector-store/sync
│   └── polyfills/
│       └── node-module.ts    ← createRequire polyfill (CRITICAL)
├── migrations/
│   └── 0001_init.sql         ← D1 schema migration
├── scripts/
│   └── seed-zettels.ts       ← Test seeding script
├── wrangler.jsonc            ← Cloudflare configuration
├── tsconfig.json             ← TypeScript configuration
├── package.json              ← Dependencies & scripts
├── README.md                 ← This file
└── testing.md               ← Testing instructions
```

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `BETTER_AUTH_SECRET` | Secret | Encryption secret for Better Auth |
| `BETTER_AUTH_URL` | `wrangler.jsonc` vars | Public URL of the Worker |
| `DATABASE_ID` | `wrangler.jsonc` | D1 database ID |

## Important Notes

- **The `node:module` polyfill is CRITICAL.** Without it, Better Auth crashes on Cloudflare Workers because `import.meta.url` is undefined inside Rolldown bundles. See `src/polyfills/node-module.ts`.
- **API keys (not cookies)** are used for auth from the Obsidian desktop app context. Use the Better Auth API key plugin to generate `bak_...` tokens.
- **Vector store isolation:** Each user gets their own Durable Object instance keyed by user ID.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run locally with Wrangler dev server |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run db:create` | Create the D1 database |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to production |
| `npm run auth:generate` | Generate Better Auth schema |
| `npm run auth:migrate` | Run Better Auth built-in migration |
| `npm run seed` | Run seed script (see testing.md) |
| `npm run lint` | Type-check with TypeScript |

## License

MIT
