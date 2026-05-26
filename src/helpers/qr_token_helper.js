/**
 * qr_token_helper.js
 *
 * Client-side QR token signing and verification using the browser's
 * built-in Web Crypto API (HMAC-SHA256).
 *
 * Token format:  base64(entityId) + "." + hex(HMAC-SHA256(secret, entityId))
 *
 * The resulting token is ~78 characters — short enough for a QR code,
 * but tedious enough to type manually (deterrence goal).
 *
 * The signing secret is read from VITE_QR_SIGNING_SECRET at build time.
 * Change this value per deployment to invalidate all previously printed QR codes.
 */

const SECRET =
  import.meta.env.VITE_QR_SIGNING_SECRET || "bmp-default-secret-change-me";

let _cachedKey = null;

async function getKey() {
  if (_cachedKey) return _cachedKey;
  _cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _cachedKey;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sign an entity ID and return a QR token string.
 * The same entityId always produces the same token (deterministic).
 *
 * @param {string} entityId  The raw entity ID (e.g. "central", "STAFF-001")
 * @returns {Promise<string>} The token to embed in a QR code
 */
export async function signEntity(entityId) {
  const key = await getKey();
  const data = new TextEncoder().encode(String(entityId));
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const b64id = btoa(String(entityId));
  return `${b64id}.${toHex(sig)}`;
}

/**
 * Decode and verify a QR token.
 * Returns the original entityId if the token is valid, or null if invalid/tampered.
 *
 * @param {string} token  The scanned QR string
 * @returns {Promise<string|null>} The original entityId, or null if invalid
 */
export async function decodeToken(token) {
  if (!token || !token.includes(".")) return null;
  const dotIdx = token.indexOf(".");
  const b64id = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);

  let entityId;
  try {
    entityId = atob(b64id);
  } catch {
    return null;
  }

  // Re-sign and compare
  const key = await getKey();
  const data = new TextEncoder().encode(entityId);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const expectedSig = toHex(sig);

  if (providedSig !== expectedSig) return null;
  return entityId;
}
