# AgentLuhmann API Authentication Guide

This document describes the authentication flow for the AgentLuhmann API.

The API uses **[Better Auth](https://www.better-auth.com/)** with **email/password** and the **API Key** plugin. Auth endpoints are mounted at `/api/auth/*`. All protected business endpoints (`/api/capture`, `/api/similarity`, `/api/vector-store/sync`) require an API key via `Authorization: Bearer <api-key>`.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Sign Up](#sign-up)
3. [Sign In](#sign-in)
4. [Create an API Key](#create-an-api-key)
5. [Use the API Key](#use-the-api-key)
6. [Verify an API Key](#verify-an-api-key)
7. [Revoke an API Key](#revoke-an-api-key)
8. [Sign Out](#sign-out)
9. [Full Example Flow](#full-example-flow)
10. [Error Reference](#error-reference)

---

## Architecture Overview

```
User (Obsidian Plugin / curl)
  │
  ├─ Sign Up / Sign In ──→ POST /api/auth/sign-up/email
  │                         POST /api/auth/sign-in/email
  │                         (Better Auth → D1 SQLite)
  │
  ├─ Create API Key ─────→ POST /api/auth/api-key/create
  │                         (Requires active session)
  │
  └─ Use API Key ────────→ Authorization: Bearer bak_...
                            on /api/capture, /api/similarity,
                            /api/vector-store/sync
```

- **Better Auth** handles user accounts, sessions, and API keys.
- **Cloudflare D1** (`agent-luhmann-db`) stores the `user`, `session`, `account`, `verification`, and `apikey` tables.
- **API keys** (not cookies) are the primary auth mechanism for the Obsidian desktop plugin because cookies are unreliable in that context.

---

## Sign Up

Create a new user account with email and password.

**Endpoint:** `POST /api/auth/sign-up/email`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "strongpassword123",
  "name": "Jane Doe"
}
```

**Success Response (200):**
```json
{
  "token": "<session_token>",
  "user": {
    "id": "<user_id>",
    "name": "Jane Doe",
    "email": "user@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-05-01T00:00:00.000Z",
    "updatedAt": "2026-05-01T00:00:00.000Z"
  }
}
```

> **Note:** The session `token` returned in the JSON can be used as a Bearer token for subsequent authenticated requests (e.g., creating an API key). Better Auth also sets a session cookie automatically.

---

## Sign In

Authenticate an existing user to get a session.

**Endpoint:** `POST /api/auth/sign-in/email`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "strongpassword123"
}
```

**Success Response (200):**
```json
{
  "token": "<session_token>",
  "user": {
    "id": "<user_id>",
    "name": "Jane Doe",
    "email": "user@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## Create an API Key

After signing in, create an API key to access protected endpoints. This request **must be authenticated** with the session token or cookie.

**Endpoint:** `POST /api/auth/api-key/create`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <session_token>
```

**Body:**
```json
{
  "name": "obsidian-plugin",
  "expiresIn": 2592000
}
```

- `name` (string): A descriptive name for the key.
- `expiresIn` (number, optional): TTL in seconds. Example: `2592000` = 30 days. Omit for no expiration.

**Success Response (200):**
```json
{
  "id": "<api_key_id>",
  "name": "obsidian-plugin",
  "start": "bak_",
  "prefix": "bak",
  "key": "bak_<random_token>",
  "expiresAt": "2026-06-01T00:00:00.000Z",
  "createdAt": "2026-05-01T00:00:00.000Z"
}
```

> **Important:** Save the `key` value immediately. It is only returned once and cannot be retrieved again.

---

## Use the API Key

Include the API key in the `Authorization` header for all protected endpoints.

**Header format:**
```
Authorization: Bearer bak_<token>
```

**Protected Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/capture` | LLM rewrite + embedding + similarity |
| POST | `/api/similarity` | Embedding + similarity score |
| POST | `/api/vector-store/sync` | Bulk sync notes to vector store |

**Example request:**
```bash
curl -X POST https://<worker>/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bak_your_api_key_here" \
  -d '{ "content": "A fleeting idea about knowledge graphs." }'
```

---

## Verify an API Key

You can verify that an API key is valid and active.

**Endpoint:** `POST /api/auth/api-key/verify`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "key": "bak_your_api_key_here"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "userId": "<user_id>",
  "apiKey": {
    "id": "<api_key_id>",
    "name": "obsidian-plugin",
    "expiresAt": "...",
    ...
  }
}
```

**Invalid Response (200):**
```json
{
  "valid": false
}
```

---

## Revoke an API Key

Delete an API key so it can no longer be used. Requires authentication.

**Endpoint:** `POST /api/auth/api-key/revoke`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <session_token>
```

**Body:**
```json
{
  "keyId": "<api_key_id>"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

## Sign Out

Invalidate the current session.

**Endpoint:** `POST /api/auth/sign-out`

**Headers:**
```
Authorization: Bearer <session_token>
```

Or send the request with the session cookie (if calling from a browser).

**Success Response (200):**
```json
{
  "success": true
}
```

---

## Full Example Flow

Below is a complete shell example from account creation to making a protected request.

```bash
# Configuration
BASE_URL="https://agent-luhmann-api.YOUR_SUBDOMAIN.workers.dev"

# -------------------------------------------------
# 1. Sign Up
# -------------------------------------------------
SIGN_UP=$(curl -s -X POST "$BASE_URL/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "SuperSecret123!",
    "name": "Jane Doe"
  }')

echo "Sign up response:"
echo "$SIGN_UP" | jq .

# Extract session token
SESSION_TOKEN=$(echo "$SIGN_UP" | jq -r '.token')

# -------------------------------------------------
# 2. Create API Key
# -------------------------------------------------
API_KEY_RESP=$(curl -s -X POST "$BASE_URL/api/auth/api-key/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{
    "name": "my-obsidian-key",
    "expiresIn": 2592000
  }')

echo "API key creation response:"
echo "$API_KEY_RESP" | jq .

# Extract the API key (starts with bak_)
API_KEY=$(echo "$API_KEY_RESP" | jq -r '.key')
echo "Your API key: $API_KEY"

# -------------------------------------------------
# 3. Use API Key on a protected endpoint
# -------------------------------------------------
curl -s -X POST "$BASE_URL/api/capture" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{ "content": "An idea about semantic knowledge networks." }' | jq .
```

---

## Error Reference

| HTTP Status | Error | Cause |
|-------------|-------|-------|
| 400 | Validation error | Missing or invalid fields in request body |
| 401 | Unauthorized | Missing `Authorization` header |
| 401 | Invalid API key | API key is invalid, expired, or revoked |
| 409 | Email already exists | Sign up with an email already in use |
| 429 | Rate limited | Too many requests (rate limit: 100 req / 60s window) |
| 500 | Internal server error | Server-side issue (check `BETTER_AUTH_SECRET`) |

---

## Important Notes

- **API keys** (`bak_...`) are the primary mechanism for authenticating from the Obsidian desktop app because cookies do not persist reliably in that environment.
- **Sessions** are useful for web-based admin tools or the initial API key creation step.
- The API key plugin supports **rate limiting per key**, **expiration**, and **refill quotas**. Refer to the [Better Auth API Key docs](https://www.better-auth.com/docs/plugins/api-key) for advanced configuration.
- **Vector store isolation:** Each user gets their own Durable Object instance. The API key ensures users can only access their own vector store data.
