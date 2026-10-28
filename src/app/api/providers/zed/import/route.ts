/**
 * API endpoint for importing Zed IDE OAuth credentials
 *
 * POST /api/providers/zed/import
 *
 * Discovers and imports OAuth credentials from Zed IDE's keychain storage.
 * Supports all major Zed providers: OpenAI, Anthropic, Google, Mistral, xAI, etc.
 *
 * When keytar/libsecret is unavailable (Android/Termux), the endpoint falls back to
 * the encrypted local store at `$DATA_DIR/zed-credentials.json`. Callers can also
 * seed that store directly by sending `{ provider, account, token }` in the body.
 *
 * Security: protected by requireManagementAuth.
 */

import { NextResponse } from "next/server";
import {
  discoverZedCredentials,
  getKeychainStatus,
  isZedInstalled,
  saveZedCredential,
  type KeychainStatus,
} from "@/lib/zed-oauth/keychain-reader";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { createProviderConnection } from "@/lib/db/providers";

interface ManualImportBody {
  provider?: string;
  service?: string;
  account?: string;
  token?: string;
}

interface ImportResponse {
  success: boolean;
  count?: number;
  providers?: string[];
  credentials?: Array<{
    provider: string;
    service: string;
    account: string;
    hasToken: boolean;
  }>;
  error?: string;
  zedInstalled?: boolean;
  storage?: KeychainStatus["backend"];
  storagePath?: string;
}

/**
 * Saves a single credential to the active backend + OmniRoute's provider table.
 * Used for manual seeding on platforms without libsecret (Termux/Android).
 */
async function importOne(
  provider: string,
  service: string,
  account: string,
  token: string
): Promise<ImportResponse> {
  const status = await getKeychainStatus();
  const backend = await saveZedCredential({ provider, service, account, token });

  await createProviderConnection({
    provider,
    authType: "apikey",
    apiKey: token,
    name: `Zed Import (${account || service})`,
    isActive: true,
  });

  return {
    success: true,
    count: 1,
    providers: [provider],
    credentials: [{ provider, service, account, hasToken: true }],
    zedInstalled: true,
    storage: backend,
    storagePath: status.storePath,
  };
}

export async function POST(request: Request): Promise<NextResponse<ImportResponse> | Response> {
  // Security verification
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  const status = await getKeychainStatus();

  try {
    // Manual seed path: works on Termux where there is no OS keychain at all.
    const body = (await request.json().catch(() => null)) as ManualImportBody | null;
    if (body?.token) {
      const provider = typeof body.provider === "string" ? body.provider.trim() : "";
      const token = body.token.trim();

      if (!provider) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing 'provider' for manual credential import.",
            storage: status.backend,
            storagePath: status.storePath,
          },
          { status: 400 }
        );
      }

      const service =
        typeof body.service === "string" && body.service.trim()
          ? body.service.trim()
          : `zed-${provider}`;
      const account =
        typeof body.account === "string" && body.account.trim() ? body.account.trim() : "api-key";

      try {
        const result = await importOne(provider, service, account, token);
        console.log(
          `[Zed Import] Manually stored credential for ${provider} in ${result.storage} backend`
        );
        return NextResponse.json(result);
      } catch (err: any) {
        console.error(`[Zed Import] Failed to save manual credential for ${provider}:`, err);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to store credential: ${err?.message || "Unknown error"}`,
            storage: status.backend,
            storagePath: status.storePath,
          },
          { status: 500 }
        );
      }
    }

    // Check if Zed is installed
    const zedInstalled = await isZedInstalled();

    if (!zedInstalled) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Zed IDE does not appear to be installed on this system. " +
            "On Android/Termux you can seed the encrypted local store instead by POSTing " +
            '{"provider":"openai","token":"<api-key>"}.',
          zedInstalled: false,
          storage: status.backend,
          storagePath: status.storePath,
        },
        { status: 404 }
      );
    }

    // Discover credentials from the active backend (keytar or encrypted file)
    console.log(`[Zed Import] Discovering Zed credentials via ${status.backend} backend...`);
    const credentials = await discoverZedCredentials();

    if (credentials.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        providers: [],
        credentials: [],
        zedInstalled: true,
        storage: status.backend,
        storagePath: status.storePath,
      });
    }

    // Save to database using OmniRoute's provider schema
    let savedCount = 0;
    for (const cred of credentials) {
      if (!cred.token) continue;

      try {
        await createProviderConnection({
          provider: cred.provider,
          authType: "apikey",
          apiKey: cred.token,
          name: `Zed Import (${cred.account || cred.service})`,
          isActive: true,
        });
        savedCount++;
      } catch (err) {
        console.error(`[Zed Import] Failed to save credential for ${cred.provider}:`, err);
      }
    }

    const credentialSummary = credentials.map((cred) => ({
      provider: cred.provider,
      service: cred.service,
      account: cred.account,
      hasToken: Boolean(cred.token),
    }));

    const importedProviders = credentials.map((c) => c.provider);
    const uniqueProviders = [...new Set(importedProviders)];

    console.log(
      `[Zed Import] Discovered ${credentials.length} credentials and successfully saved ${savedCount} for ${uniqueProviders.length} providers`
    );

    return NextResponse.json({
      success: true,
      count: savedCount,
      providers: uniqueProviders,
      credentials: credentialSummary,
      zedInstalled: true,
      storage: status.backend,
      storagePath: status.storePath,
    });
  } catch (error: any) {
    console.error("[Zed Import] Error importing credentials:", error);

    if (error?.message?.includes("User canceled") || error?.message?.includes("denied")) {
      return NextResponse.json(
        {
          success: false,
          error: "Keychain access denied. Please grant permission when prompted by your OS.",
          storage: status.backend,
          storagePath: status.storePath,
        },
        { status: 403 }
      );
    }

    if (error?.message?.includes("not found") || error?.message?.includes("ENOENT")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Keychain service not available on this system. " +
            "On Android/Termux, keytar/libsecret is not supported — credentials are stored " +
            `encrypted at ${status.storePath}. Seed it with POST {"provider":"<id>","token":"<key>"}.`,
          storage: status.backend,
          storagePath: status.storePath,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Failed to import credentials: ${error?.message || "Unknown error"}`,
        storage: status.backend,
        storagePath: status.storePath,
      },
      { status: 500 }
    );
  }
}
