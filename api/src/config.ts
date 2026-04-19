import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Environment variable ${key} is not set.`);
  return val;
}

export const config = {
  apiKey: requireEnv("SIGNALOID_API_KEY"),
  baseURL: process.env.SIGNALOID_API_URL ?? "https://api.signaloid.io",
  repoURL: requireEnv("GITHUB_REPO_URL"),
  repoBranch: process.env.GITHUB_REPO_BRANCH ?? "main",
  buildDirectory: "src",
  // Core ID of the C0-S+ core (Uncertain Type). Override via SIGNALOID_CORE_ID.
  coreID:
    process.env.SIGNALOID_CORE_ID ?? "cor_b21e4de9927158c1a5b603c2affb8a09",
  paramsFile: resolve(__dirname, "../..", "params.json"),
  poll: {
    initialDelayMs: 2_000,
    maxDelayMs: 30_000,
  },
} as const;
