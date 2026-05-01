import { betterAuth } from "better-auth";
import { apiKey } from "@better-auth/api-key";
import Database from "better-sqlite3";

const db = new Database(":memory:");

export const auth = betterAuth({
  database: db,
  secret: "cli-secret",
  baseURL: "http://localhost",
  emailAndPassword: { enabled: true },
  plugins: [apiKey()],
});
