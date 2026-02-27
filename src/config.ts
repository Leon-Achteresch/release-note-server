import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads a .env file manually without an external dotenv dependency at runtime.
 * Falls back gracefully if the file does not exist.
 */
function loadDotEnv(path: string = resolve(process.cwd(), '.env')): void {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    return; // no .env file — that's fine
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // Strip optional surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Don't override already-set environment variables
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load .env on first import
loadDotEnv();

export interface AppConfig {
  /** OpenRouter API key (required for AI features) */
  openRouterApiKey: string | undefined;
  /** Default model to use via OpenRouter */
  openRouterModel: string;
  /** OpenRouter API base URL */
  openRouterBaseUrl: string;
  /** HTTP server port */
  port: number;
  /** HTTP server host */
  host: string;
}

export const config: AppConfig = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
};
