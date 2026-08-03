import { getConfiguredEnv, isConfiguredSecret } from "@/lib/env/secrets";

type HeaderSource = string | null;
type CronTokenSource =
  | "authorization"
  | "Authorization"
  | "x-cron-secret"
  | "x-vercel-cron-secret"
  | "x-vercel-cron-token"
  | "x-cron-token"
  | "query:secret"
  | "query:cron_secret"
  | "query:token";

type CronTokenCandidate = {
  token: string;
  source: CronTokenSource;
};

function resolveAuthorizationToken(headerValue: HeaderSource) {
  if (!headerValue) return null;
  const normalized = headerValue.trim();
  if (!normalized) return null;

  const bearer = /^Bearer\s+(.+)$/i.exec(normalized);
  if (bearer?.[1]) return bearer[1].trim();
  return normalized;
}

export function extractCronToken(request: Request): string | null {
  return extractCronTokenWithSource(request)?.token ?? null;
}

export function extractCronTokenWithSource(request: Request): CronTokenCandidate | null {
  const candidates: HeaderSource[] = [
    request.headers.get("authorization"),
    request.headers.get("Authorization"),
    request.headers.get("x-cron-secret"),
    request.headers.get("x-vercel-cron-secret"),
    request.headers.get("x-vercel-cron-token"),
    request.headers.get("x-cron-token"),
  ];
  const candidateSources: CronTokenSource[] = [
    "authorization",
    "Authorization",
    "x-cron-secret",
    "x-vercel-cron-secret",
    "x-vercel-cron-token",
    "x-cron-token",
  ];
  for (const [index, candidate] of candidates.entries()) {
    const token = resolveAuthorizationToken(candidate);
    if (token) return { token, source: candidateSources[index]! };
  }

  const url = new URL(request.url);
  const queryCandidates: Array<[string, CronTokenSource]> = [
    ["secret", "query:secret"],
    ["cron_secret", "query:cron_secret"],
    ["token", "query:token"],
  ];
  for (const [queryKey, source] of queryCandidates) {
    const queryToken = resolveAuthorizationToken(url.searchParams.get(queryKey));
    if (queryToken) return { token: queryToken, source };
  }
  return null;
}

export function isCronAuthorized(request: Request): boolean {
  const secret = getConfiguredEnv("CRON_SECRET");
  if (!isConfiguredSecret(secret)) return false;
  const token = extractCronToken(request);
  return isConfiguredSecret(token) && token === secret;
}
