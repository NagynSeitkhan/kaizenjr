export const SESSION_COOKIE = "dashboard_session";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function secret(): string {
  const s = process.env.APP_ENCRYPTION_KEY;
  if (!s) throw new Error("APP_ENCRYPTION_KEY is not set");
  return s;
}

// Uses the Web Crypto API (not node:crypto) so this file works unmodified in
// both the Node.js runtime (route handlers) and the Edge runtime (middleware).
async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(signature);
}

export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function expectedSessionToken(): Promise<string> {
  const password = process.env.DASHBOARD_PASSWORD ?? "";
  return hmacSha256Hex(secret(), password);
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedSessionToken();
  return secureCompare(token, expected);
}
