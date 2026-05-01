# Testing Guide

This document describes how to test the AgentLuhmann API locally and after deploying to Cloudflare.

---

## Table of Contents

1. [Local Testing](#local-testing)
2. [Deployed Testing](#deployed-testing)
3. [Auth Flow Testing](#auth-flow-testing)
4. [Vector Store Testing](#vector-store-testing)
5. [End-to-End Capture Flow](#end-to-end-capture-flow)
6. [Troubleshooting](#troubleshooting)

---

## Local Testing

### 1. Start the dev server

```bash
npm run dev
```

The worker runs at `http://localhost:8787` by default.

### 2. Verify the health endpoint

```bash
curl http://localhost:8787/
```

Expected: `AgentLuhmann API OK`

### 3. Test Better Auth

```bash
# Check auth status
curl http://localhost:8787/api/auth/ok
```

Expected: `{ "status": "ok" }`

### 4. Create a test user and API key

Since the API key plugin is enabled, first create a user via the Better Auth endpoints:

```bash
# Sign up
curl -X POST http://localhost:8787/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

Expected: JSON with user object and session.

Then sign in to get a session:

```bash
# Sign in
curl -X POST http://localhost:8787/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

Create an API key (this requires a session cookie from the sign-in response; use the session token from the response headers or JSON):

```bash
# Create API key
curl -X POST http://localhost:8787/api/auth/api-key/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{ "name": "test-key", "expiresIn": 86400 }'
```

Save the returned `key` (starts with `bak_...`) — this is your API key for protected endpoints.

### 5. Test protected endpoints

**POST /api/similarity** (works even with empty vector store):

```bash
curl -X POST http://localhost:8787/api/similarity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{ "content": "This is a test note about knowledge management." }'
```

Expected: `{ "maxScore": 0, "avgScore": 0, "count": 0, "topNotes": [] }`

**POST /api/capture**:

```bash
curl -X POST http://localhost:8787/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{ "content": "A fleeting idea about linking notes together for better discovery." }'
```

Expected: JSON with `rewrittenContent`, `title`, `keywords`, `similarityScore`, and `similarNotes`.

### 6. Test vector store sync

Create a `test-zettels.json` file:

```json
[
  {
    "id": "01_zettels/20250101-test.md",
    "path": "01_zettels/20250101-test.md",
    "content": "Zettelkasten is a method of note-taking and personal knowledge management."
  },
  {
    "id": "01_zettels/20250102-test.md",
    "path": "01_zettels/20250102-test.md",
    "content": "Links between notes create emergent structures of knowledge."
  }
]
```

```bash
curl -X POST http://localhost:8787/api/vector-store/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d @test-zettels.json
```

Expected: `{ "synced": 2, "removed": 0 }`

### 7. Re-test similarity after sync

```bash
curl -X POST http://localhost:8787/api/similarity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{ "content": "Zettelkasten note-taking and knowledge management methods." }'
```

Expected: Non-zero `maxScore` and `avgScore` with `topNotes` containing the synced zettels.

---

## Deployed Testing

After running `npm run deploy`, use your deployed Worker URL (e.g. `https://agent-luhmann-api.YOUR_SUBDOMAIN.workers.dev`) instead of `http://localhost:8787`.

### Quick deployed verification

```bash
export API_URL="https://agent-luhmann-api.YOUR_SUBDOMAIN.workers.dev"

# Health check
curl $API_URL/

# Auth OK
curl $API_URL/api/auth/ok
```

### Full deployed test sequence

Repeat the local testing steps above but replace the base URL with your deployed URL.

**Note:** The first time you deploy, you must:
1. Create the remote D1 database (same name as local)
2. Apply migrations remotely (`npm run db:migrate:remote`)
3. Set the `BETTER_AUTH_SECRET` secret remotely (`npx wrangler secret put BETTER_AUTH_SECRET`)
4. Update `BETTER_AUTH_URL` in `wrangler.jsonc` to the deployed URL and re-deploy

---

## Auth Flow Testing

The API uses Better Auth with the API key plugin. Test the full flow:

1. **Sign up** → `POST /api/auth/sign-up/email`
2. **Sign in** → `POST /api/auth/sign-in/email`
3. **Create API key** → `POST /api/auth/api-key/create` (requires session)
4. **Verify API key** → `POST /api/auth/api-key/verify` (requires key)
5. **Use API key** → Include `Authorization: Bearer bak_...` in all protected requests
6. **Revoke API key** → `POST /api/auth/api-key/revoke`

### Test unauthorized access

```bash
curl -X POST http://localhost:8787/api/capture \
  -H "Content-Type: application/json" \
  -d '{ "content": "test" }'
```

Expected: `401 Unauthorized`

### Test invalid API key

```bash
curl -X POST http://localhost:8787/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-key" \
  -d '{ "content": "test" }'
```

Expected: `401 Invalid API key`

---

## Vector Store Testing

### Seed via the sync endpoint

Use the `scripts/seed-zettels.ts` script to prepare a JSON payload, then send it via curl:

```bash
# Generate payload
npx tsx scripts/seed-zettels.ts --user-id=test-user --file=./test-zettels.json

# Send payload
curl -X POST http://localhost:8787/api/vector-store/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d @test-zettels.json
```

### Verify sync and deduplication

Send the same payload twice. Expected:
- First call: `{ "synced": N, "removed": 0 }`
- Second call: `{ "synced": N, "removed": 0 }` (same counts, idempotent)

### Verify pruning

Send a payload with fewer notes than before. Expected:
- `synced`: count of new notes
- `removed`: count of notes no longer in the payload

### Test per-user isolation

Create two users with different API keys. Sync different notes to each. Verify that:
- User A's similarity queries return only User A's notes
- User B's similarity queries return only User B's notes

---

## End-to-End Capture Flow

Test the complete flow as the Obsidian plugin would use it:

1. User writes a fleeting note
2. Plugin sends `POST /api/capture` with the raw content
3. Worker:
   - Rewrites the note via LLM (`@cf/meta/llama-3.1-8b-instruct`)
   - Generates embeddings (`@cf/baai/bge-base-en-v1.5`)
   - Queries the user's VectorStore for similar zettels
   - Returns the rewritten note + similarity info
4. Plugin presents the AI first pass to the user
5. On promote to zettel, plugin sends `POST /api/vector-store/sync` to add the new zettel

Test this with:

```bash
curl -X POST http://localhost:8787/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{ "content": "I had an interesting thought today about how networks of notes create emergent knowledge structures, similar to how neurons form connections in the brain." }'
```

Verify the response contains:
- `rewrittenContent`: A refined version of the note
- `title`: A suggested title
- `keywords`: Relevant tags
- `similarityScore.maxScore`: Similarity to existing zettels
- `similarNotes`: Top 5 similar zettels (if any exist)

---

## Troubleshooting

### Worker fails to start

Check Wrangler logs. If you see an error about `createRequire`, verify the polyfill:

```bash
grep "node:module" wrangler.jsonc
```

Expected: `"node:module": "./src/polyfills/node-module.ts"`

### D1 database errors

Verify the database ID in `wrangler.jsonc` matches your created database:

```bash
npx wrangler d1 list
```

### Auth endpoint returns 500

Ensure `BETTER_AUTH_SECRET` is set:

```bash
npx wrangler secret list
```

If missing:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

### AI/embedding errors

Verify Workers AI is enabled on your Cloudflare account. The `ai` binding in `wrangler.jsonc` should match:

```jsonc
"ai": { "binding": "AI" }
```

### VectorStore not found

Ensure the DO migration has been applied:

```bash
npx wrangler d1 migrations apply agent-luhmann-db --local
```

For remote:

```bash
npx wrangler d1 migrations apply agent-luhmann-db --remote
```

---

## Automation

For automated testing, you can chain these commands into a script. Example:

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:8787"
API_KEY="bak_your_test_key"

echo "=== Health Check ==="
curl -s $BASE_URL/

echo -e "\n=== Auth OK ==="
curl -s $BASE_URL/api/auth/ok | jq .

echo -e "\n=== Similarity (empty store) ==="
curl -s -X POST $BASE_URL/api/similarity \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"test"}' | jq .

echo -e "\n=== Capture ==="
curl -s -X POST $BASE_URL/api/capture \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"A note about knowledge graphs and semantic connections."}' | jq .
```

---

## Notes

- Workers AI models used:
  - **LLM:** `@cf/meta/llama-3.1-8b-instruct`
  - **Embedding:** `@cf/baai/bge-base-en-v1.5` (768-dimensional vectors)
- The seed script (`scripts/seed-zettels.ts`) is a CLI helper for preparing JSON payloads. It does not connect directly to the worker — use `curl` or the Obsidian plugin to send data.
- All protected endpoints require `Authorization: Bearer <api-key>`.

