import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolate the JSON credential store in a temp dir before importing the modules.
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-zed-creds-"));
const TEST_STORE_FILE = path.join(TEST_DATA_DIR, "zed-credentials.json");
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.OMNIROUTE_ZED_CREDENTIALS_FILE = TEST_STORE_FILE;

const store = await import("../../src/lib/zed-oauth/credential-store.ts");
const reader = await import("../../src/lib/zed-oauth/keychain-reader.ts");

function resetStore() {
  fs.rmSync(TEST_STORE_FILE, { force: true });
}

test("credential store: missing file is treated as empty and never throws", () => {
  resetStore();

  assert.deepEqual(store.readCredentialStore(), { version: 1, credentials: [] });
  assert.deepEqual(store.findStoredCredentials("zed-openai"), []);
  assert.equal(store.getStoredPassword("zed-openai", "api-key"), null);
  assert.equal(store.hasStoredCredentials(), false);
  assert.equal(store.getCredentialStorePath(), TEST_STORE_FILE);
});

test("credential store: upsert persists atomically with 0600 permissions", () => {
  resetStore();

  const ok = store.upsertStoredCredential({
    service: "zed-openai",
    account: "api-key",
    token: "sk-test-openai",
    provider: "openai",
  });
  assert.equal(ok, true);

  assert.equal(fs.existsSync(TEST_STORE_FILE), true);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(TEST_STORE_FILE).mode & 0o777, 0o600);
  }

  // No leftover .tmp files from the atomic write.
  const leftovers = fs.readdirSync(TEST_DATA_DIR).filter((name) => name.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);

  // Upsert replaces instead of duplicating.
  store.upsertStoredCredential({
    service: "zed-openai",
    account: "api-key",
    token: "sk-test-openai-2",
  });

  const all = store.readCredentialStore();
  assert.equal(all.credentials.length, 1);
  assert.equal(store.getStoredPassword("zed-openai", "api-key"), "sk-test-openai-2");
});

test("credential store: lookups are service case-insensitive and account exact", () => {
  resetStore();

  store.upsertStoredCredential({
    service: "Zed-Anthropic",
    account: "oauth",
    token: "sk-ant-oauth",
    provider: "anthropic",
  });

  assert.equal(store.findStoredCredentials("zed-anthropic").length, 1);
  assert.equal(store.findStoredCredentials("ZED-ANTHROPIC").length, 1);
  assert.equal(store.getStoredPassword("zed-anthropic", "oauth"), "sk-ant-oauth");
  assert.equal(store.getStoredPassword("zed-anthropic", "other-account"), null);
});

test("credential store: malformed JSON degrades to an empty store", () => {
  fs.writeFileSync(TEST_STORE_FILE, "{ this is not json", "utf8");

  assert.deepEqual(store.readCredentialStore(), { version: 1, credentials: [] });
  assert.equal(store.hasStoredCredentials(), false);
});

test("credential store: bare array format and invalid entries are handled", () => {
  fs.writeFileSync(
    TEST_STORE_FILE,
    JSON.stringify([
      { service: "zed-xai", account: "token", token: "xai-token" },
      { service: "zed-xai", account: "broken" },
      "nope",
    ]),
    "utf8"
  );

  const loaded = store.readCredentialStore();
  assert.equal(loaded.credentials.length, 1);
  assert.equal(loaded.credentials[0].token, "xai-token");
});

test("credential store: removeStoredCredentials reports removals", () => {
  resetStore();

  store.upsertStoredCredential({ service: "zed-openai", account: "a", token: "1" });
  store.upsertStoredCredential({ service: "zed-openai", account: "b", token: "2" });
  store.upsertStoredCredential({ service: "zed-google", account: "a", token: "3" });

  assert.equal(store.removeStoredCredentials("zed-openai"), 2);
  assert.equal(store.removeStoredCredentials("zed-openai"), 0);
  assert.deepEqual(
    store.readCredentialStore().credentials.map((credential) => credential.service),
    ["zed-google"]
  );
});

test("keychain-reader works without keytar and maps provider ids", async () => {
  resetStore();

  store.upsertStoredCredential({
    service: "zed-deepseek",
    account: "api-key",
    token: "sk-deepseek",
  });

  const discovered = await reader.discoverZedCredentials();
  assert.deepEqual(discovered, [
    {
      provider: "deepseek",
      service: "zed-deepseek",
      account: "api-key",
      token: "sk-deepseek",
    },
  ]);

  const single = await reader.getZedCredential("deepseek");
  assert.equal(single?.token, "sk-deepseek");
  assert.equal(await reader.getZedCredential("mistral"), null);

  // Credentials present in the local store count as "Zed importable".
  assert.equal(await reader.isZedInstalled(), true);
});

test("keychain-reader: no stored credentials yields an empty result", async () => {
  resetStore();

  assert.deepEqual(await reader.discoverZedCredentials(), []);
  assert.equal(await reader.getZedCredential("openai"), null);
});
