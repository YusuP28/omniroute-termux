/**
 * Zed credential store with a keytar → encrypted-file fallback.
 *
 * `keytar` is a native module that needs libsecret on Linux and is unavailable on
 * Android/Termux. Every keytar call is therefore wrapped: if the module is missing
 * (e.g. `node_modules/keytar` renamed) or a call fails at runtime, the store
 * transparently falls back to an AES-256-GCM encrypted JSON file in the OmniRoute
 * data directory (`DATA_DIR`, default `~/.omniroute/zed-credentials.json`).
 *
 * The fallback key lives next to the store in `zed-credentials.key` (mode 0600) and
 * is generated on first use — no libsecret, no env var required.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { resolveDataDir } from "../dataPaths";

const STORE_FILE = "zed-credentials.json";
const KEY_FILE = "zed-credentials.key";
const STORE_VERSION = 1;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const PREFIX = "enc:v1:";

export type KeychainBackend = "keytar" | "file";

export interface StoredCredential {
  account: string;
  password: string;
}

interface StoreFile {
  version: number;
  updatedAt: string;
  /** service -> account -> encrypted password */
  services: Record<string, Record<string, string>>;
}

/** Minimal keytar surface (CJS/native; typings may not expose `default`). */
export type KeytarModule = {
  findCredentials: (service: string) => Promise<Array<{ account: string; password: string }>>;
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
};

let keytarCache: KeytarModule | null | undefined; // undefined = not probed yet

/**
 * Probe keytar once. Returns null when the module is missing or unusable.
 * Never throws — this is the crash guard for Termux/Android.
 */
export async function loadKeytar(): Promise<KeytarModule | null> {
  if (keytarCache !== undefined) return keytarCache;

  try {
    const mod = (await import("keytar")) as { default?: KeytarModule } & KeytarModule;
    const resolved = mod?.default ?? mod;
    keytarCache =
      resolved && typeof resolved.getPassword === "function" ? (resolved as KeytarModule) : null;
  } catch {
    keytarCache = null;
  }

  return keytarCache;
}

/** Which backend the store currently uses. */
export async function getKeychainBackend(): Promise<KeychainBackend> {
  return (await loadKeytar()) ? "keytar" : "file";
}

/** Absolute path of the encrypted fallback store (for diagnostics/tests). */
export function getLocalStorePath(): string {
  return path.join(resolveDataDir(), STORE_FILE);
}

/** Absolute path of the fallback encryption key (for diagnostics/tests). */
export function getLocalKeyPath(): string {
  return path.join(resolveDataDir(), KEY_FILE);
}

// ── Encryption ───────────────────────────────────────────────────────────────

let cachedKey: Buffer | null = null;

function getLocalKey(): Buffer {
  if (cachedKey) return cachedKey;

  const keyFile = getLocalKeyPath();
  try {
    const decoded = Buffer.from(fs.readFileSync(keyFile, "utf8").trim(), "base64");
    if (decoded.length === KEY_LENGTH) {
      cachedKey = decoded;
      return decoded;
    }
  } catch {
    // Missing/corrupt key file — generate a new one below.
  }

  const key = randomBytes(KEY_LENGTH);
  fs.mkdirSync(path.dirname(keyFile), { recursive: true });
  fs.writeFileSync(keyFile, key.toString("base64"), { mode: 0o600 });
  try {
    fs.chmodSync(keyFile, 0o600);
  } catch {
    // chmod is best-effort (no-op on some Android filesystems).
  }

  cachedKey = key;
  return key;
}

function encryptValue(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getLocalKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}:${ciphertext.toString("base64url")}:${authTag.toString("base64url")}`;
}

function decryptValue(value: string): string | null {
  // Legacy plaintext entries are returned as-is so old stores keep working.
  if (!value.startsWith(PREFIX)) return value;

  const [ivB64, ciphertextB64, authTagB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !ciphertextB64 || !authTagB64) return null;

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getLocalKey(),
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(authTagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error: any) {
    console.warn("[Zed credentials] Failed to decrypt stored credential:", error?.message || error);
    return null;
  }
}

// ── File backend ─────────────────────────────────────────────────────────────

function readStore(): StoreFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(getLocalStorePath(), "utf8")) as StoreFile;
    if (parsed && typeof parsed === "object" && parsed.services) {
      return {
        version: parsed.version ?? STORE_VERSION,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        services: parsed.services,
      };
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn("[Zed credentials] Could not read local store:", error?.message || error);
    }
  }

  return { version: STORE_VERSION, updatedAt: new Date().toISOString(), services: {} };
}

let writeChain: Promise<void> = Promise.resolve();

/** Serialize writes and persist atomically (tmp file + rename, mode 0600). */
function writeStore(store: StoreFile): Promise<void> {
  const run = async () => {
    const file = getLocalStorePath();
    await fs.promises.mkdir(path.dirname(file), { recursive: true });

    const next: StoreFile = { ...store, updatedAt: new Date().toISOString() };
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;

    await fs.promises.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    await fs.promises.rename(tmp, file);

    try {
      await fs.promises.chmod(file, 0o600);
    } catch {
      // Best-effort on Android filesystems.
    }
  };

  writeChain = writeChain.then(run, run);
  return writeChain;
}

async function fileFindCredentials(service: string): Promise<StoredCredential[]> {
  const accounts = readStore().services[service];
  if (!accounts) return [];

  const credentials: StoredCredential[] = [];
  for (const [account, value] of Object.entries(accounts)) {
    const password = decryptValue(value);
    if (password) credentials.push({ account, password });
  }
  return credentials;
}

async function fileGetPassword(service: string, account: string): Promise<string | null> {
  const value = readStore().services[service]?.[account];
  return value ? decryptValue(value) : null;
}

async function fileSetPassword(
  service: string,
  account: string,
  password: string
): Promise<void> {
  const store = readStore();
  store.services[service] = store.services[service] || {};
  store.services[service][account] = encryptValue(password);
  await writeStore(store);
}

async function fileDeletePassword(service: string, account: string): Promise<boolean> {
  const store = readStore();
  const bucket = store.services[service];
  if (!bucket?.[account]) return false;

  delete bucket[account];
  if (Object.keys(bucket).length === 0) delete store.services[service];

  await writeStore(store);
  return true;
}

// ── Facade: keytar first, encrypted file as fallback ─────────────────────────

export async function findCredentials(service: string): Promise<StoredCredential[]> {
  const keytar = await loadKeytar();

  if (keytar) {
    try {
      const credentials = await keytar.findCredentials(service);
      const valid = (credentials || []).filter(
        (credential) => typeof credential?.password === "string" && credential.password.length > 0
      );
      if (valid.length > 0) return valid;
    } catch (error: any) {
      console.warn(
        `[Zed credentials] keytar findCredentials failed for '${service}', using local store:`,
        error?.message || error
      );
    }
  }

  return fileFindCredentials(service);
}

export async function getPassword(service: string, account: string): Promise<string | null> {
  const keytar = await loadKeytar();

  if (keytar) {
    try {
      const password = await keytar.getPassword(service, account);
      if (password) return password;
    } catch (error: any) {
      console.warn(
        `[Zed credentials] keytar getPassword failed for '${service}/${account}', using local store:`,
        error?.message || error
      );
    }
  }

  return fileGetPassword(service, account);
}

export async function setPassword(
  service: string,
  account: string,
  password: string
): Promise<KeychainBackend> {
  const keytar = await loadKeytar();

  if (keytar) {
    try {
      await keytar.setPassword(service, account, password);
      return "keytar";
    } catch (error: any) {
      console.warn(
        `[Zed credentials] keytar setPassword failed for '${service}/${account}', using local store:`,
        error?.message || error
      );
    }
  }

  await fileSetPassword(service, account, password);
  return "file";
}

export async function deletePassword(service: string, account: string): Promise<boolean> {
  const keytar = await loadKeytar();
  let deleted = false;

  if (keytar) {
    try {
      deleted = await keytar.deletePassword(service, account);
    } catch {
      // Fall through to the local store.
    }
  }

  const deletedLocally = await fileDeletePassword(service, account);
  return deleted || deletedLocally;
}
