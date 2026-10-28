import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// keytar is not installed/usable in this environment (on Termux it is renamed to
// keytar_disabled), which is exactly the fallback scenario we want to exercise.
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-zed-store-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const store = await import("../../src/lib/zed-oauth/credential-store.ts");
const reader = await import("../../src/lib/zed-oauth/keychain-reader.ts");

test.after(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("falls back to the encrypted file backend when keytar is unavailable", async () => {
  const backend = await store.getKeychainBackend();
  assert.equal(backend, "file");
});

test("stores, reads, and deletes credentials through the fallback store", async () => {
  const service = "zed-openai-test";
  const account = "api-key";
  const token = "sk-test-token-1234567890";

  const writtenTo = await store.setPassword(service, account, token);
  assert.equal(writtenTo, "file");

  assert.equal(await store.getPassword(service, account), token);

  const found = await store.findCredentials(service);
  assert.equal(found.length, 1);
  assert.equal(found[0].account, account);
  assert.equal(found[0].password, token);

  assert.equal(await store.deletePassword(service, account), true);
  assert.equal(await store.getPassword(service, account), null);
});

test("persists credentials encrypted at rest (no plaintext secret on disk)", async () => {
  const service = "zed-anthropic-test";
  const token = "sk-ant-super-secret-value";

  await store.setPassword(service, "api-key", token);

  const storePath = store.getLocalStorePath();
  assert.ok(fs.existsSync(storePath), "store file should exist");

  const raw = fs.readFileSync(storePath, "utf8");
  assert.ok(!raw.includes(token), "plaintext token must not appear in the store file");
  assert.ok(raw.includes("enc:v1:"), "values should be AES-256-GCM ciphertext");

  if (process.platform !== "win32") {
    const mode = fs.statSync(storePath).mode & 0o777;
    assert.equal(mode, 0o600, "store file should be owner-only");
    const keyMode = fs.statSync(store.getLocalKeyPath()).mode & 0o777;
    assert.equal(keyMode, 0o600, "key file should be owner-only");
  }
});

test("stores credential entries under separate services", async () => {
  await store.setPassword("zed-xai-test", "api-key", "xai-token");
  await store.setPassword("zed-google-test", "token", "google-token");

  const xai = await store.findCredentials("zed-xai-test");
  const google = await store.findCredentials("zed-google-test");

  assert.deepEqual(xai.map((c) => c.password), ["xai-token"]);
  assert.deepEqual(google.map((c) => c.password), ["google-token"]);
});

test("zed reader discovers credentials from the fallback store", async () => {
  const savedBackend = await reader.saveZedCredential({
    provider: "openai",
    service: "zed-openai",
    account: "api-key",
    token: "sk-from-fallback-store",
  });
  assert.equal(savedBackend, "file");

  const discovered = await reader.discoverZedCredentials();
  const openai = discovered.find((cred) => cred.service === "zed-openai");

  assert.ok(openai, "discovered credential should include zed-openai");
  assert.equal(openai.provider, "openai");
  assert.equal(openai.token, "sk-from-fallback-store");

  const single = await reader.getZedCredential("openai");
  assert.ok(single);
  assert.equal(single.token, "sk-from-fallback-store");

  const status = await reader.getKeychainStatus();
  assert.equal(status.backend, "file");
  assert.equal(status.storePath, store.getLocalStorePath());
});

test("corrupt or missing store files never throw", async () => {
  const originalStore = store.getLocalStorePath();
  const backup = fs.readFileSync(originalStore, "utf8");

  fs.writeFileSync(originalStore, "{ this is not json");

  const creds = await store.findCredentials("zed-deepseek");
  assert.deepEqual(creds, []);

  fs.writeFileSync(originalStore, backup);
});

test("deleting a missing credential returns false instead of throwing", async () => {
  assert.equal(await store.deletePassword("zed-missing-test", "nope"), false);
});
