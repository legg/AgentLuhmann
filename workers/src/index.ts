import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { createAuth, type Env } from "./auth/index.js";
import { handleCapture } from "./routes/capture.js";
import { handleSimilarity } from "./routes/similarity.js";
import { handleSync } from "./routes/sync.js";
import { VectorStore } from "./vector-store/index.js";

export { VectorStore };

const app = new Hono();

// CORS
app.use("/api/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Mount Better Auth
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env as Env);
  return auth.handler(c.req.raw);
});

// Hash an API key the same way Better Auth does (SHA-256 → base64url no padding)
async function hashApiKey(key: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const bytes = new Uint8Array(hash);
  // Base64url encode without padding
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Auth middleware for protected routes
async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  if (!apiKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = (c.env as Env).DB;
  const hashedKey = await hashApiKey(apiKey);

  // Look up the hashed API key in the database
  const { results } = await db.prepare(
    "SELECT id, referenceId, expiresAt, enabled FROM apikey WHERE key = ? LIMIT 1"
  ).bind(hashedKey).all();

  if (!results || results.length === 0) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  const row = results[0] as { id: string; referenceId: string; expiresAt: string | null; enabled: number | null };

  // Check if key is disabled
  if (row.enabled === 0) {
    return c.json({ error: "API key is disabled" }, 401);
  }

  // Check if key is expired
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    return c.json({ error: "API key has expired" }, 401);
  }

  c.set("userId", row.referenceId);
  await next();
}

// Protected routes
app.post("/api/capture", authMiddleware, handleCapture);
app.post("/api/similarity", authMiddleware, handleSimilarity);
app.post("/api/vector-store/sync", authMiddleware, handleSync);

// Health check
app.get("/", (c) => c.text("AgentLuhmann API OK"));

export default app;
