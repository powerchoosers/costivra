import { getConfiguredEnv } from "@/lib/env/secrets";

type OpenRouterMessage = {
  role: "system" | "user";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "file"; file: { filename: string; file_data: string } }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function getOpenRouterKey(): string {
  const key = getConfiguredEnv("OPEN_ROUTER_API_KEY") ?? getConfiguredEnv("OPENROUTER_API_KEY");

  if (!key) {
    throw new Error("OPEN_ROUTER_API_KEY is not configured for this server environment.");
  }

  return key;
}

/**
 * Runs a bounded, non-streaming request and returns JSON supplied by the model.
 * The caller is responsible for validating the shape before it can affect data
 * or a workflow decision.
 */
export async function generateJson({
  messages,
  maxTokens = 1_200,
  temperature = 0,
  plugins,
  signal,
}: {
  messages: OpenRouterMessage[];
  maxTokens?: number;
  temperature?: number;
  plugins?: Array<{ id: "file-parser"; pdf: { engine: "mistral-ocr" | "cloudflare-ai" | "native" } }>;
  signal?: AbortSignal;
}): Promise<unknown> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
      messages,
      ...(plugins ? { plugins } : {}),
      response_format: { type: "json_object" },
      temperature: Math.min(1, Math.max(0, temperature)),
      max_tokens: maxTokens,
    }),
    signal: signal ?? AbortSignal.timeout(45_000),
  });

  const payload = (await response.json().catch(() => null)) as OpenRouterResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `AI request failed (${response.status}).`);
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("The AI service returned no usable response.");
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("The AI service returned malformed structured data.");
  }
}
