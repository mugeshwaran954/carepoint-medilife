import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env")
});

const requiredEnv = ["DATABASE_URL"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port: Number(process.env.PORT ?? 5000),

  databaseUrl: process.env.DATABASE_URL!,

  jwtSecret:
    process.env.JWT_SECRET ??
    "development-only-secret-change-before-production",

  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",

  frontendUrl:
    process.env.FRONTEND_URL ?? "http://localhost:5173"
};