import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function keyFromEnv(): Buffer {
  const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY is required");
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes");
  return key;
}

export function encryptMailboxToken(value: string): string {
  if (!value) throw new Error("Cannot encrypt an empty mailbox token");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyFromEnv(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptMailboxToken(payload: string): string {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Invalid encrypted mailbox token");
  const decipher = createDecipheriv(ALGORITHM, keyFromEnv(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}
