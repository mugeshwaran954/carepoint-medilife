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
    process.env.FRONTEND_URL ?? "http://localhost:5173",

  llmProvider: process.env.LLM_PROVIDER,
  llmApiKey: process.env.LLM_API_KEY,
  llmModel: process.env.LLM_MODEL,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM || "noreply@healthcare.com",

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/v1/calendar/google/callback"
};