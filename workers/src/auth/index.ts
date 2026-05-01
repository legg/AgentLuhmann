import { betterAuth } from "better-auth";
import { apiKey } from "@better-auth/api-key";

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  VECTOR_STORE: DurableObjectNamespace;
  AI: Ai;
}

export function createAuth(env: Env) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    plugins: [apiKey()],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
  });
}
