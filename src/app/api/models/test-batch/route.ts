import { FREE_PROVIDERS, OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/providers";
import { DEFAULT_PRICING } from "@/shared/constants/pricing";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { buildComboTestRequestBody, extractComboTestResponseText } from "@/lib/combos/testHealth";

const testBatchSchema = z.object({
  models: z.array(z.string()).min(1).max(200),
  concurrency: z.number().int().min(1).max(5).default(3),
  timeoutMs: z.number().int().min(5000).max(60000).default(5000),
});

async function testSingleModel(
  modelStr: string,
  internalUrl: string,
  timeoutMs: number
) {
  const startTime = Date.now();
  try {
    const testBody = buildComboTestRequestBody(modelStr);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(internalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Test": "model-batch-test",
          "X-OmniRoute-No-Cache": "true",
          "X-Request-Id": `model-test-${randomUUID()}`,
        },
        body: JSON.stringify(testBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      let responseBody = null;
      try {
        responseBody = await res.json();
      } catch {
        responseBody = null;
      }

      const responseText = extractComboTestResponseText(responseBody);
      if (!responseText) {
        return {
          model: modelStr,
          status: "error",
          statusCode: res.status,
          error: "Provider returned HTTP 200 but no text content.",
          latencyMs,
        };
      }

      return { model: modelStr, status: "ok", latencyMs, responseText };
    }

    let errorMsg = "";
    try {
      const errBody = await res.json();
      errorMsg = errBody?.error?.message || errBody?.error || res.statusText;
    } catch {
      errorMsg = res.statusText;
    }

    return {
      model: modelStr,
      status: "error",
      statusCode: res.status,
      error: errorMsg,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      model: modelStr,
      status: "error",
      error: error.name === "AbortError" ? `Timeout (${timeoutMs}ms)` : error.message,
      latencyMs,
    };
  }
}

function getBaseUrl(request: Request) {
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * POST /api/models/test-batch - Batch test multiple models
 * Body: { models: string[], concurrency?: number, timeoutMs?: number }
 * Returns: { results: ModelTestResult[], testedAt: string }
 */
export async function POST(request: Request) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  const validation = validateBody(testBatchSchema, rawBody);
  if (isValidationFailure(validation)) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { models, concurrency, timeoutMs } = validation.value;

  const filteredModels = models.filter((modelStr) => {
    const [providerId, ...rest] = modelStr.split('/');
    const modelName = rest.join('/');
    const pricing = DEFAULT_PRICING[providerId]?.[modelName];
    if (pricing) {
      // If all pricing fields are zero, treat as free
      return Object.values(pricing).every((v) => Number(v) === 0);
    }
    // Fallback: consider models containing "free" (case-insensitive) as free
    return /free/i.test(modelStr);
  });
  const internalUrl = `${getBaseUrl(request)}/v1/chat/completions`;

  // Process models in batches with controlled concurrency
  const results = [];
  for (let i = 0; i < filteredModels.length; i += concurrency) {
    const batch = filteredModels.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((modelStr) => testSingleModel(modelStr, internalUrl, timeoutMs))
    );
    results.push(...batchResults);
  }

  return NextResponse.json({
    results,
    testedAt: new Date().toISOString(),
  });
}