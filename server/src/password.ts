import { toBase64Url, fromBase64Url, timingSafeEqual } from "./crypto-utils.js";

// PBKDF2-SHA256 vía Web Crypto (`crypto.subtle`), nativo en el runtime de
// Workers — sin dependencias externas. bcrypt/scrypt no encajan aquí:
// bcryptjs es JS puro y puede acercarse al límite de CPU por petición en
// Workers; los bindings nativos de bcrypt (@node-rs/bcrypt) no son
// compatibles con el runtime (sin filesystem, sin módulos nativos); scrypt
// no forma parte del estándar Web Crypto. 210 000 iteraciones sigue la
// recomendación de OWASP (2023+) para PBKDF2-HMAC-SHA256.
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_LENGTH_BITS = 256;

const encoder = new TextEncoder();

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return new Uint8Array(bits);
}

// Formato de almacenamiento: pbkdf2$<iteraciones>$<salt base64url>$<hash base64url>
// Las iteraciones se guardan junto al hash para poder subirlas en el futuro
// sin invalidar las contraseñas ya guardadas con un valor menor.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(parts[2]);
  const expected = parts[3];
  const actual = toBase64Url(await derive(password, salt, iterations));
  return timingSafeEqual(actual, expected);
}
