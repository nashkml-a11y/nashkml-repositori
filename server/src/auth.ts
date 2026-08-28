import { toBase64Url, fromBase64Url } from "./crypto-utils.js";

// Token de sesión = payload.firma, ambos en base64url, firmados con HMAC-SHA256.
// No es JWT estándar (no hace falta: claims fijos, sin cabecera ni alg
// negociable) pero sigue el mismo principio: firma verificable sin guardar
// sesiones en la base de datos. El payload lleva el user_id (`sub`), así que
// cada petición autenticada sabe de quién son los datos que puede tocar.
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface TokenPayload {
  sub: string; // user_id
  exp: number;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createToken(secret: string, userId: string): Promise<string> {
  const payload: TokenPayload = { sub: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${toBase64Url(signature)}`;
}

export async function verifyToken(
  secret: string,
  token: string | undefined | null
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;

  try {
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureB64),
      encoder.encode(payloadB64)
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadB64))) as Partial<TokenPayload>;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}
