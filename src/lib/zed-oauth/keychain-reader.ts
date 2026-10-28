/**
 * Zed IDE OAuth Token Extractor
 *
 * Extracts OAuth credentials previously stored by Zed IDE.
 *
 * Android/Termux note: `keytar` (libsecret / Keychain / Credential Manager) is
 * not available on Android, so it is no longer used. Credentials are read from
 * OmniRoute's local JSON credential store instead:
 *
 *   $DATA_DIR/zed-credentials.json   (default ~/.omniroute/zed-credentials.json)
 *
 * See `./credential-store.ts` for the on-disk format and helpers. On desktop
 * platforms keytar could be re-introduced as an optional enrichment source,
 * but the app must never require it to boot.
 */

import fs from "fs";
import os from "os";
import path from "path";
import {
  findStoredCredentials,
  getStoredPassword,
  hasStoredCredentials,
  upsertStoredCredential,
  removeStoredCredentials,
  getCredentialStorePath,
} from "./credential-store";

export interface ZedCredential {
  provider: string;
  service: string;
  account: string;
  token: string;
}

/**
 * Common service name patterns used by Zed IDE for storing OAuth tokens
 */
const ZED_SERVICE_PATTERNS = [
  // OpenAI
  "zed-openai",
  "ai.zed.openai",
  "zed.openai",
  "Zed-OpenAI",

  // Anthropic
  "zed-anthropic",
  "ai.zed.anthropic",
  "zed.anthropic",
  "Zed-Anthropic",

  // Google AI
  "zed-google",
  "ai.zed.google",
  "zed.google",
  "Zed-Google",

  // Mistral
  "zed-mistral",
  "ai.zed.mistral",
  "zed.mistral",
  "Zed-Mistral",

  // xAI
  "zed-xai",
  "ai.zed.xai",
  "zed.xai",
  "Zed-xAI",

  // OpenRouter
  "zed-openrouter",
  "ai.zed.openrouter",
  "zed.openrouter",
  "Zed-OpenRouter",

  // DeepSeek
  "zed-deepseek",
  "ai.zed.deepseek",
  "zed.deepseek",
  "Zed-DeepSeek",
];

/**
 * Maps Zed service names to OmniRoute provider IDs
 */
function extractProviderFromService(service: string): string {
  const lower = service.toLowerCase();
  if (lower.includes("openai")) return "openai";
  if (lower.includes("anthropic")) return "anthropic";
  if (lower.includes("google")) return "google";
  if (lower.includes("mistral")) return "mistral";
  if (lower.includes("xai")) return "xai";
  if (lower.includes("openrouter")) return "openrouter";
  if (lower.includes("deepseek")) return "deepseek";
  return "unknown";
}

/**
 * Discovers all Zed OAuth credentials from the local credential store.
 *
 * @returns Array of discovered credentials with provider, service, and token
 */
export async function discoverZedCredentials(): Promise<ZedCredential[]> {
  const credentials: ZedCredential[] = [];
  const seen = new Set<string>();

  for (const pattern of ZED_SERVICE_PATTERNS) {
    for (const stored of findStoredCredentials(pattern)) {
      if (!stored.token) {
        console.debug(`Skipping credential with missing token: ${pattern}/${stored.account}`);
        continue;
      }

      const key = `${pattern.toLowerCase()}::${stored.account}`;
      if (seen.has(key)) continue;
      seen.add(key);

      credentials.push({
        provider: stored.provider || extractProviderFromService(pattern),
        service: pattern,
        account: stored.account,
        token: stored.token,
      });
    }
  }

  if (credentials.length === 0) {
    console.debug(
      `[Zed credentials] No credentials found in ${getCredentialStorePath()} — nothing to import`
    );
  }

  return credentials;
}

/**
 * Gets a specific Zed credential for a provider.
 *
 * First resolves any credential stored for the matching service patterns, then
 * falls back to common account names (api-key, token, oauth, <provider>).
 *
 * @param provider - Provider name (openai, anthropic, google, etc.)
 * @returns The credential if found, null otherwise
 */
export async function getZedCredential(provider: string): Promise<ZedCredential | null> {
  const patterns = ZED_SERVICE_PATTERNS.filter((p) =>
    p.toLowerCase().includes(provider.toLowerCase())
  );

  for (const pattern of patterns) {
    // First, try the first stored credential for this service.
    const stored = findStoredCredentials(pattern).find((credential) => credential.token);
    if (stored) {
      return {
        provider: stored.provider || extractProviderFromService(pattern),
        service: pattern,
        account: stored.account,
        token: stored.token,
      };
    }

    // Fallback: Try common account name patterns.
    const accountNames = ["api-key", "token", "oauth", provider];

    for (const account of accountNames) {
      const token = getStoredPassword(pattern, account);
      if (token) {
        return {
          provider,
          service: pattern,
          account,
          token,
        };
      }
    }
  }

  return null;
}

/**
 * Checks whether Zed-related configuration or credentials are available.
 *
 * On Android/Termux Zed is not installed, so the local credential store is the
 * authoritative signal that there is something to import.
 *
 * @returns true if a Zed config directory or stored credentials exist
 */
export async function isZedInstalled(): Promise<boolean> {
  const homeDir = os.homedir();
  const zedConfigPaths = [
    path.join(homeDir, ".config", "zed"), // Linux
    path.join(homeDir, "Library", "Application Support", "Zed"), // macOS
    path.join(homeDir, "AppData", "Roaming", "Zed"), // Windows
  ];

  for (const configPath of zedConfigPaths) {
    if (fs.existsSync(configPath)) {
      return true;
    }
  }

  return hasStoredCredentials();
}

// Re-exported so callers (CLI/import UI) can seed the local store without
// pulling in keytar.
export {
  upsertStoredCredential,
  removeStoredCredentials,
  getCredentialStorePath,
  hasStoredCredentials,
};
