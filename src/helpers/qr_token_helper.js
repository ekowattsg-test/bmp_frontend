/**
 * Client-side QR token signing and verification using the browser's Web Crypto API.
 *
 * Token format:
 *   Timed:    [meta0][dt0-1][base64(entityId)][dt2-3][dt4-5].[dt6-7][sig0-20][dt8-9][sig21-42][dt10-11][sig43-63][meta1]
 *   Untimed:  [meta0][base64(entityId)].[signatureHex][meta1]
 *
 * The hidden metadata marker encodes whether the token is time-scoped. Timed tokens
 * embed a yyyymmddhhmm string, append it to the signing secret, and validate it on decode.
 */

const BASE_SECRET =
  import.meta.env.VITE_QR_SIGNING_SECRET || "bmp-default-secret-change-me";
const DEFAULT_MAX_AGE_MINUTES = 30;
const DATETIME_PATTERN = /^\d{12}$/;
const LEGACY_DATETIME_PATTERN = /^\d{10}$/;
const TOKEN_SEPARATOR = ".";
const DATETIME_SEGMENT_LENGTH = 2;
const SIGNATURE_HEX_LENGTH = 64;
const SIGNATURE_CHUNK_LENGTHS = [21, 22, 21];
const TIMED_METADATA = Object.freeze({ prefix: "q", suffix: "8" });
const UNTIMED_METADATA = Object.freeze({ prefix: "r", suffix: "3" });

const _keyCache = new Map();

export class QrTokenError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "QrTokenError";
    this.code = code;
  }
}

function parsePositiveInt(value, fallbackValue) {
  const parsedValue = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
}

function getMaxAgeMinutes() {
  return parsePositiveInt(
    import.meta.env.VITE_QR_TOKEN_MAX_AGE_MINUTES,
    DEFAULT_MAX_AGE_MINUTES,
  );
}

async function getKey(secret) {
  if (_keyCache.has(secret)) {
    return _keyCache.get(secret);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  if (_keyCache.size >= 96) {
    _keyCache.clear();
  }
  _keyCache.set(secret, key);
  return key;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatDatePart(value) {
  return String(value).padStart(2, "0");
}

function getDatetimeString(currentTime = new Date()) {
  return [
    String(currentTime.getFullYear()),
    formatDatePart(currentTime.getMonth() + 1),
    formatDatePart(currentTime.getDate()),
    formatDatePart(currentTime.getHours()),
    formatDatePart(currentTime.getMinutes()),
  ].join("");
}

function parseDatetimeString(datetimeString) {
  const isMinutePrecision = DATETIME_PATTERN.test(datetimeString);
  const isLegacyHourPrecision = LEGACY_DATETIME_PATTERN.test(datetimeString);
  if (!isMinutePrecision && !isLegacyHourPrecision) {
    throw new QrTokenError("QR token datetime is invalid.", "INVALID_DATETIME");
  }

  const year = Number.parseInt(datetimeString.slice(0, 4), 10);
  const month = Number.parseInt(datetimeString.slice(4, 6), 10);
  const day = Number.parseInt(datetimeString.slice(6, 8), 10);
  const hour = Number.parseInt(datetimeString.slice(8, 10), 10);
  const minute = isMinutePrecision
    ? Number.parseInt(datetimeString.slice(10, 12), 10)
    : 0;

  const parsedDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day ||
    parsedDate.getHours() !== hour ||
    parsedDate.getMinutes() !== minute
  ) {
    throw new QrTokenError("QR token datetime is invalid.", "INVALID_DATETIME");
  }

  return parsedDate;
}

function validateTokenDatetime(datetimeString, options = {}) {
  const currentTime = options.currentTime || new Date();
  const maxAgeMinutes =
    options.maxAgeMinutes === undefined
      ? getMaxAgeMinutes()
      : options.maxAgeMinutes;

  const parsedDate = parseDatetimeString(datetimeString);
  const ageMs = Math.abs(currentTime.getTime() - parsedDate.getTime());
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    throw new QrTokenError("QR token has expired.", "EXPIRED_TOKEN");
  }

  return parsedDate;
}

function buildScopedSecret(datetimeString) {
  if (!datetimeString) {
    return BASE_SECRET;
  }

  return `${BASE_SECRET}${datetimeString}`;
}

function getTokenMetadata(noTimeScope = false) {
  return noTimeScope ? UNTIMED_METADATA : TIMED_METADATA;
}

function resolveTokenMetadata(leftPart, rightPart) {
  if (!leftPart || !rightPart) {
    return null;
  }

  const prefix = leftPart[0];
  const suffix = rightPart[rightPart.length - 1];

  if (prefix === TIMED_METADATA.prefix && suffix === TIMED_METADATA.suffix) {
    return { noTimeScope: false };
  }

  if (
    prefix === UNTIMED_METADATA.prefix &&
    suffix === UNTIMED_METADATA.suffix
  ) {
    return { noTimeScope: true };
  }

  return null;
}

function splitDatetime(datetimeString) {
  if (datetimeString.length % DATETIME_SEGMENT_LENGTH !== 0) {
    throw new QrTokenError("QR token datetime is invalid.", "INVALID_DATETIME");
  }

  return Array.from(
    { length: datetimeString.length / DATETIME_SEGMENT_LENGTH },
    (_, index) => {
      const start = index * DATETIME_SEGMENT_LENGTH;
      return datetimeString.slice(start, start + DATETIME_SEGMENT_LENGTH);
    },
  );
}

function splitSignature(signatureHex) {
  if (signatureHex.length !== SIGNATURE_HEX_LENGTH) {
    throw new QrTokenError(
      "QR token signature is invalid.",
      "INVALID_SIGNATURE",
    );
  }

  const [firstLength, secondLength] = SIGNATURE_CHUNK_LENGTHS;
  return [
    signatureHex.slice(0, firstLength),
    signatureHex.slice(firstLength, firstLength + secondLength),
    signatureHex.slice(firstLength + secondLength),
  ];
}

function composeToken(
  base64EntityId,
  signatureHex,
  datetimeString,
  options = {},
) {
  const metadata = getTokenMetadata(options.noTimeScope);

  if (options.noTimeScope) {
    return `${metadata.prefix}${base64EntityId}${TOKEN_SEPARATOR}${signatureHex}${metadata.suffix}`;
  }

  const datetimeParts = splitDatetime(datetimeString);
  const [sig1, sig2, sig3] = splitSignature(signatureHex);

  if (datetimeParts.length === 6) {
    const [dt1, dt2, dt3, dt4, dt5, dt6] = datetimeParts;
    return `${metadata.prefix}${dt1}${base64EntityId}${dt2}${dt3}${TOKEN_SEPARATOR}${dt4}${sig1}${dt5}${sig2}${dt6}${sig3}${metadata.suffix}`;
  }

  if (datetimeParts.length === 5) {
    const [dt1, dt2, dt3, dt4, dt5] = datetimeParts;
    return `${metadata.prefix}${dt1}${base64EntityId}${dt2}${TOKEN_SEPARATOR}${dt3}${sig1}${dt4}${sig2}${dt5}${sig3}${metadata.suffix}`;
  }

  throw new QrTokenError("QR token datetime is invalid.", "INVALID_DATETIME");
}

function extractTimedTokenParts(leftPart, rightPart) {
  if (leftPart.length < 4 || rightPart.length !== 70) {
    throw new QrTokenError("QR token format is invalid.", "INVALID_FORMAT");
  }

  const dt4 = rightPart.slice(0, 2);
  const sig1 = rightPart.slice(2, 23);
  const dt5 = rightPart.slice(23, 25);
  const sig2 = rightPart.slice(25, 47);
  const dt6 = rightPart.slice(47, 49);
  const sig3 = rightPart.slice(49);
  const signatureHex = `${sig1}${sig2}${sig3}`;

  const parseMinutePrecision = () => {
    if (leftPart.length < 6) {
      throw new QrTokenError("QR token format is invalid.", "INVALID_FORMAT");
    }

    const dt1 = leftPart.slice(0, 2);
    const dt2 = leftPart.slice(-4, -2);
    const dt3 = leftPart.slice(-2);
    const base64EntityId = leftPart.slice(2, -4);
    const datetimeString = `${dt1}${dt2}${dt3}${dt4}${dt5}${dt6}`;

    parseDatetimeString(datetimeString);

    if (!base64EntityId) {
      throw new QrTokenError("QR token payload is invalid.", "INVALID_PAYLOAD");
    }

    return {
      base64EntityId,
      datetimeString,
      noTimeScope: false,
      signatureHex,
    };
  };

  const parseLegacyHourPrecision = () => {
    const dt1 = leftPart.slice(0, 2);
    const dt2 = leftPart.slice(-2);
    const base64EntityId = leftPart.slice(2, -2);
    const datetimeString = `${dt1}${dt2}${dt4}${dt5}${dt6}`;

    parseDatetimeString(datetimeString);

    if (!base64EntityId) {
      throw new QrTokenError("QR token payload is invalid.", "INVALID_PAYLOAD");
    }

    return {
      base64EntityId,
      datetimeString,
      noTimeScope: false,
      signatureHex,
    };
  };

  try {
    return parseMinutePrecision();
  } catch (error) {
    if (!(error instanceof QrTokenError) || error.code !== "INVALID_DATETIME") {
      throw error;
    }

    return parseLegacyHourPrecision();
  }
}

function extractUntimedTokenParts(leftPart, rightPart) {
  if (!leftPart || rightPart.length !== SIGNATURE_HEX_LENGTH) {
    throw new QrTokenError("QR token format is invalid.", "INVALID_FORMAT");
  }

  return {
    base64EntityId: leftPart,
    datetimeString: null,
    noTimeScope: true,
    signatureHex: rightPart,
  };
}

function extractTokenParts(token) {
  if (!token || !token.includes(TOKEN_SEPARATOR)) {
    throw new QrTokenError("QR token format is invalid.", "INVALID_FORMAT");
  }

  const separatorIndex = token.indexOf(TOKEN_SEPARATOR);
  const leftPart = token.slice(0, separatorIndex);
  const rightPart = token.slice(separatorIndex + 1);

  const metadata = resolveTokenMetadata(leftPart, rightPart);
  if (metadata) {
    const strippedLeftPart = leftPart.slice(1);
    const strippedRightPart = rightPart.slice(0, -1);

    return metadata.noTimeScope
      ? extractUntimedTokenParts(strippedLeftPart, strippedRightPart)
      : extractTimedTokenParts(strippedLeftPart, strippedRightPart);
  }

  return extractTimedTokenParts(leftPart, rightPart);
}

/**
 * Sign an entity ID and return a QR token string.
 * The same entityId produces different tokens over time because the datetime
 * is appended to the signing secret and embedded into the token payload.
 *
 * @param {string} entityId
 * @param {{ currentTime?: Date, noTimeScope?: boolean }} [options]
 * @returns {Promise<string>}
 */
export async function signEntity(entityId, options = {}) {
  const currentTime = options.currentTime || new Date();
  const noTimeScope = options.noTimeScope === true;
  const datetimeString = noTimeScope ? null : getDatetimeString(currentTime);
  const key = await getKey(buildScopedSecret(datetimeString));
  const normalizedEntityId = String(entityId);
  const data = new TextEncoder().encode(normalizedEntityId);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const base64EntityId = btoa(normalizedEntityId);

  return composeToken(base64EntityId, toHex(signature), datetimeString, {
    noTimeScope,
  });
}

export async function decodeTokenOrThrow(token, options = {}) {
  const { base64EntityId, datetimeString, noTimeScope, signatureHex } =
    extractTokenParts(token);

  if (!noTimeScope) {
    validateTokenDatetime(datetimeString, options);
  }

  let entityId;
  try {
    entityId = atob(base64EntityId);
  } catch {
    throw new QrTokenError("QR token payload is invalid.", "INVALID_PAYLOAD");
  }

  const key = await getKey(buildScopedSecret(datetimeString));
  const data = new TextEncoder().encode(entityId);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const expectedSignature = toHex(signature);

  if (signatureHex !== expectedSignature) {
    throw new QrTokenError(
      "QR token signature check failed.",
      "INVALID_SIGNATURE",
    );
  }

  return entityId;
}

/**
 * Decode and verify a QR token.
 * Returns the original entityId if the token is valid, or null if invalid/tampered.
 *
 * @param {string} token
 * @param {{ currentTime?: Date, maxAgeMinutes?: number }} [options]
 * @returns {Promise<string|null>}
 */
export async function decodeToken(token, options = {}) {
  try {
    return await decodeTokenOrThrow(token, options);
  } catch {
    return null;
  }
}

export const __private__ = {
  buildScopedSecret,
  composeToken,
  extractTokenParts,
  getDatetimeString,
  getMaxAgeMinutes,
  getTokenMetadata,
  parseDatetimeString,
  resolveTokenMetadata,
  validateTokenDatetime,
};
