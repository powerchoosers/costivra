import { randomUUID } from "node:crypto";

const REQUEST_ID_MAX_LENGTH = 120;

function cleanRequestId(value: string | null | undefined) {
  const cleaned = value?.trim().replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, REQUEST_ID_MAX_LENGTH);
  return cleaned || null;
}

/** Returns a safe correlation value without accepting arbitrary log content. */
export function getRequestId(request: Request) {
  return cleanRequestId(request.headers.get("x-request-id"))
    ?? cleanRequestId(request.headers.get("x-vercel-id"))
    ?? randomUUID();
}

/** Adds the correlation value to a response without exposing request payloads. */
export function withRequestId(response: Response, requestId: string) {
  response.headers.set("x-costivra-request-id", requestId);
  return response;
}

export function safeOperationalError(code: string, requestId: string) {
  return { code, requestId };
}
