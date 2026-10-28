/**
 * Zed credential store — Android/Termux-compatible replacement for `keytar`.
 *
 * `keytar` is a native module that relies on libsecret (Linux), Keychain
 * (macOS) or Credential Manager (Windows). None of these exist on Android,
 * and building keytar under Termux fails. Credentials are therefore persisted
 * in a local JSON file inside the OmniRoute data directory:
 *
 *   $DATA_DIR/zed-credentials.json
 *   (default: ~/.omniroute/zed-credentials.json)
 *
 * Override the location with `OMNIROUTE_ZED_CREDENTIALS_FILE`.
 *
 * The file is created with mode 0600 and written atomically (tmp file +
 * rename), so a crash mid-write cannot corrupt existing credentials.
 * Nothing in this module ever logs a token.
 */

import fs from "fs";
import path from "path";
import { resolveDataDir } from "../dataPaths";

export interface StoredZedCredential {
  service: string;
  account: string;
  token: string;
  /** OmniRoute provider id (openai, anthropic, ...). Optional on disk. */
  provider?: string;
  /** ISO timestamp of the last write. */
  updatedAt?: string;
}

export interface CredentialStoreFile {
  version: number;
  credentials: StoredZedCredential[];
}

const STORE_VERSION = 1;
const STORE_FILE_NAME = "zed-credentials.json";

/** Warn only once per process for a corrupt/unreadable store. */
let warnedAboutBadStore = false;

export function getCredentialStorePath(): string {
  const configured = process.env.OMNIROUTE_ZED_CREDENTIALS_FILE?.trim();
  if (configured) return path.resolve(configured);
  return path.join(resolveDataDir(), STORE_FILE_NAME);
}

function emptyStore(): CredentialStoreFile {
  return { version: STORE_VERSION, credentials: [] };
}

function normalizeEntry(value: unknown): StoredZedCredential | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const service = typeof raw.service === "string" ? raw.service.trim() : "";
  const account = typeof raw.account === "string" ? raw.account.trim() : "";
  const token = typeof raw.token === "string" ? raw.token : "";

  if (!service || !account || !token) return null;

  const entry: StoredZedCredential = { service, account, token };
  if (typeof raw.provider === "string" && raw.provider.trim()) {
    entry.provider = raw.provider.trim();
  }
  if (typeof raw.updatedAt === "string" && raw.updatedAt.trim()) {
    entry.updatedAt = raw.updatedAt.trim();
  }
  return entry;
}

/**
 * Reads the credential store. Missing, malformed or unreadable files are
 * treated as "no credentials" so the app can always boot without keytar.
 */
export function readCredentialStore(): CredentialStoreFile {
  const storePath = getCredentialStorePath();

  let raw: string;
  try {
    raw = fs.readFileSync(storePath, "utf8");
  } catch (error: any) {
    // ENOENT is the normal "nothing imported yet" case — stay quiet.
    if (error?.code !== "ENOENT" && !warnedAboutBadStore) {
      warnedAboutBadStore = true;
      console.warn(
        `[Zed credentials] Cannot read ${storePath}: ${error?.message || error}. ` +
          "Continuing with an empty credential store."
      );
    }
    return emptyStore();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    // Accept both { version, credentials: [] } and a bare [] array.
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as CredentialStoreFile | null)?.credentials)
        ? (parsed as CredentialStoreFile).credentials
        : [];

    return {
      version: STORE_VERSION,
      credentials: list
        .map(normalizeEntry)
        .filter((entry): entry is StoredZedCredential => !!entry),
    };
  } catch (error: any) {
    if (!warnedAboutBadStore) {
      warnedAboutBadStore = true;
      console.warn(
        `[Zed credentials] Ignoring malformed JSON in ${storePath}: ${error?.message || error}`
      );
    }
    return emptyStore();
  }
}

/**
 * Persists the store atomically. Returns false instead of throwing, so a
 * read-only home directory cannot crash the app.
 */
export function writeCredentialStore(store: CredentialStoreFile): boolean {
  const storePath = getCredentialStorePath();
  const tmpPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true, mode: 0o700 });
    const payload = JSON.stringify(
      { version: STORE_VERSION, credentials: store.credentials },
      null,
      2
    );
    fs.writeFileSync(tmpPath, `${payload}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmpPath, storePath);
    try {
      fs.chmodSync(storePath, 0o600);
    } catch {
      // chmod is best-effort (e.g. FAT/exFAT storage).
    }
    return true;
  } catch (error: any) {
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {
      // ignore cleanup failure
    }
    console.warn(
      `[Zed credentials] Cannot write ${storePath}: ${error?.message || error}. ` +
        "Credentials will not survive a restart."
    );
    return false;
  }
}

/** Returns all credentials for a service (case-insensitive service match). */
export function findStoredCredentials(service: string): StoredZedCredential[] {
  const needle = service.trim().toLowerCase();
  if (!needle) return [];

  return readCredentialStore().credentials.filter(
    (credential) => credential.service.toLowerCase() === needle
  );
}

/** Returns a single credential token, or null when it is not stored. */
export function getStoredPassword(service: string, account: string): string | null {
  const match = findStoredCredentials(service).find((credential) => credential.account === account);
  return match?.token ?? null;
}

/** Inserts or replaces a credential (same service + account). */
export function upsertStoredCredential(
  credential: Omit<StoredZedCredential, "updatedAt"> & { updatedAt?: string }
): boolean {
  const entry = normalizeEntry({
    ...credential,
    updatedAt: credential.updatedAt ?? new Date().toISOString(),
  });
  if (!entry) return false;

  const store = readCredentialStore();
  const index = store.credentials.findIndex(
    (existing) =>
      existing.service.toLowerCase() === entry.service.toLowerCase() &&
      existing.account === entry.account
  );

  if (index >= 0) {
    store.credentials[index] = entry;
  } else {
    store.credentials.push(entry);
  }

  return writeCredentialStore(store);
}

/** Removes every credential for a service. Returns the number removed. */
export function removeStoredCredentials(service: string): number {
  const needle = service.trim().toLowerCase();
  if (!needle) return 0;

  const store = readCredentialStore();
  const kept = store.credentials.filter(
    (credential) => credential.service.toLowerCase() !== needle
  );
  const removed = store.credentials.length - kept.length;

  if (removed > 0) {
    store.credentials = kept;
    writeCredentialStore(store);
  }

  return removed;
}

/** True when at least one usable credential exists in the local store. */
export function hasStoredCredentials(): boolean {
  return readCredentialStore().credentials.length > 0;
}
