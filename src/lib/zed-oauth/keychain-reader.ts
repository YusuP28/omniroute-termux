/**
 * Zed IDE OAuth Token Extractor
 *
 * Extracts OAuth credentials from the OS keychain where Zed IDE stores them.
 * Supports macOS (Keychain), Windows (Credential Manager), and Linux (libsecret).
 *
 * `keytar` is a native module (e.g. libsecret on Linux) and is unavailable on
 * Android/Termux. All keychain access goes through `credential-store`, which
 * transparently falls back to an AES-256-GCM encrypted JSON file in the OmniRoute
 * data directory. This module therefore never crashes when keytar is missing.
 *
 * @see https://zed.dev/docs/ai/llm-providers - Official Zed documentation confirming keychain storage
 */

import fs from "fs";
import os from "os";
import path from "path";
import {
  deletePassword,
  findCredentials,
  getKeychainBackend,
  getLocalStorePath,
  getPassword,
  setPassword,
  type KeychainBackend,
} from "./credential-store";

export interface ZedCredential {
  provider: string;
  service: string;
  account: string;
  token: string;
}

export interface KeychainStatus {
  backend: KeychainBackend;
  /** Absolute path of the encrypted fallback store. */
  storePath: string;
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
 * Reports which credential backend is active. Used by the import endpoint to tell
 * the user whether the OS keychain or the encrypted local store is in use.
 */
export async function getKeychainStatus(): Promise<KeychainStatus> {
  return {
    backend: await getKeychainBackend(),
    storePath: getLocalStorePath(),
  };
}

/**
 * Discovers all Zed OAuth credentials.
 *
 * Reads the OS keychain when keytar is usable, otherwise (Termux/Android, or a
 * keytar runtime failure) reads the encrypted local store. Never throws when the
 * keychain is unavailable — it just returns an empty list.
 *
 * @returns Array of discovered credentials with provider, service, and token
 */
export async function discoverZedCredentials(): Promise<ZedCredential[]> {
  const credentials: ZedCredential[] = [];
  const seen = new Set<string>();

  for (const pattern of ZED_SERVICE_PATTERNS) {
    try {
      const found = await findCredentials(pattern);

      for (const credential of found) {
        if (!credential?.password) {
          console.debug(`Skipping credential with missing password: ${pattern}/${credential?.account}`);
          continue;
        }

        const dedupeKey = `${pattern}::${credential.account}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        credentials.push({
          provider: extractProviderFromService(pattern),
          service: pattern,
          account: credential.account,
          token: credential.password,
        });
      }
    } catch (error: any) {
      console.debug(`No credentials found for ${pattern}:`, error?.message || error);
      // Continue to next pattern
    }
  }

  return credentials;
}

/**
 * Persists a credential to the active backend. When keytar is unavailable this
 * writes to the encrypted local store, which keeps the import flow usable on
 * Termux/Android (either seeded from the desktop or entered manually).
 *
 * @returns The backend that stored the credential.
 */
export async function saveZedCredential(credential: ZedCredential): Promise<KeychainBackend> {
  return setPassword(credential.service, credential.account, credential.token);
}

/**
 * Removes a credential from both the OS keychain and the encrypted local store.
 */
export async function removeZedCredential(service: string, account: string): Promise<boolean> {
  return deletePassword(service, account);
}

/**
 * Gets a specific Zed credential for a provider.
 *
 * Health #2: Instead of hardcoded account names, first try findCredentials
 * which returns all actual credentials for the service, then fall back to common
 * patterns only if needed.
 *
 * @param provider - Provider name (openai, anthropic, google, etc.)
 * @returns The credential if found, null otherwise
 */
export async function getZedCredential(provider: string): Promise<ZedCredential | null> {
  const patterns = ZED_SERVICE_PATTERNS.filter((pattern) =>
    pattern.toLowerCase().includes(provider.toLowerCase())
  );

  for (const pattern of patterns) {
    try {
      // First, try findCredentials to get all actual credentials
      const credentials = await findCredentials(pattern);
      if (credentials.length > 0 && credentials[0].password) {
        return {
          provider,
          service: pattern,
          account: credentials[0].account,
          token: credentials[0].password,
        };
      }

      // Fallback: Try common account name patterns
      const accountNames = ["api-key", "token", "oauth", provider];

      for (const account of accountNames) {
        const token = await getPassword(pattern, account);
        if (token) {
          return {
            provider,
            service: pattern,
            account,
            token,
          };
        }
      }
    } catch (error: any) {
      console.debug(`Failed to get credential for ${pattern}:`, error?.message || error);
    }
  }

  return null;
}

/**
 * Checks if Zed IDE appears to be installed and configured
 *
 * Health #3: Convert to ES imports instead of CommonJS require()
 *
 * @returns true if Zed config directory exists
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

  return false;
}
