import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth/index.js";
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
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
}));

// Mount Better Auth
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env as Env);
  return auth.handler(c.req.raw);
});

// Auth middleware for protected routes
async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  if (!apiKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const auth = createAuth(c.env as Env);
  const valid = await auth.api.verifyApiKey({ key: apiKey });
  if (!valid.valid) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("userId", valid.userId);
  await next();
}

// Protected routes
app.post("/api/capture", authMiddleware, handleCapture);
app.post("/api/similarity", authMiddleware, handleSimilarity);
app.post("/api/vector-store/sync", authMiddleware, handleSync);

// Health check
app.get("/", (c) => c.text("AgentLuhmann API OK"));

export default app;
