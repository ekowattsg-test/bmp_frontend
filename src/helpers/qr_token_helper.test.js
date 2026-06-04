import { describe, expect, it } from "vitest";
import {
  __private__,
  decodeToken,
  decodeTokenOrThrow,
  signEntity,
} from "./qr_token_helper";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signLegacyHourToken(entityId, datetimeString) {
  const secret = __private__.buildScopedSecret(datetimeString);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(entityId),
  );

  return __private__.composeToken(
    btoa(entityId),
    toHex(signature),
    datetimeString,
    { noTimeScope: false },
  );
}

describe("qr_token_helper", () => {
  it("round-trips entity ids with a time-scoped secret", async () => {
    const currentTime = new Date(2026, 5, 4, 10, 20, 0, 0);

    const token = await signEntity("STAFF-001", { currentTime });
    const parts = __private__.extractTokenParts(token);
    const decoded = await decodeTokenOrThrow(token, { currentTime });

    expect(decoded).toBe("STAFF-001");
    expect(parts.datetimeString).toBe("202606041020");
    expect(parts.noTimeScope).toBe(false);
    expect(token.includes(parts.datetimeString)).toBe(false);
  });

  it("round-trips entity ids without time scoping when requested", async () => {
    const token = await signEntity("STAFF-001", { noTimeScope: true });
    const parts = __private__.extractTokenParts(token);
    const decoded = await decodeTokenOrThrow(token, {
      currentTime: new Date(2026, 5, 5, 18, 0, 0, 0),
    });

    expect(decoded).toBe("STAFF-001");
    expect(parts.noTimeScope).toBe(true);
    expect(parts.datetimeString).toBeNull();
    expect(token.includes("202606041020")).toBe(false);
  });

  it("rejects tokens with an invalid embedded datetime", async () => {
    const currentTime = new Date(2026, 5, 4, 10, 15, 0, 0);
    const token = await signEntity("STAFF-001", { currentTime });
    const parts = __private__.extractTokenParts(token);
    const tamperedToken = __private__.composeToken(
      parts.base64EntityId,
      parts.signatureHex,
      "202613019960",
    );

    await expect(
      decodeTokenOrThrow(tamperedToken, { currentTime }),
    ).rejects.toMatchObject({ code: "INVALID_DATETIME" });
    await expect(
      decodeToken(tamperedToken, { currentTime }),
    ).resolves.toBeNull();
  });

  it("rejects tokens outside the allowed validity window", async () => {
    const tokenTime = new Date(2026, 5, 4, 10, 5, 0, 0);
    const token = await signEntity("STAFF-001", { currentTime: tokenTime });

    await expect(
      decodeTokenOrThrow(token, {
        currentTime: new Date(2026, 5, 4, 11, 2, 0, 0),
        maxAgeMinutes: 30,
      }),
    ).rejects.toMatchObject({ code: "EXPIRED_TOKEN" });
  });

  it("rejects same-hour tokens older than 30 minutes", async () => {
    const tokenTime = new Date(2026, 5, 4, 10, 5, 0, 0);
    const token = await signEntity("STAFF-001", { currentTime: tokenTime });

    await expect(
      decodeTokenOrThrow(token, {
        currentTime: new Date(2026, 5, 4, 10, 36, 0, 0),
        maxAgeMinutes: 30,
      }),
    ).rejects.toMatchObject({ code: "EXPIRED_TOKEN" });
  });

  it("accepts tokens within 30 minutes from encryption time", async () => {
    const tokenTime = new Date(2026, 5, 4, 10, 5, 0, 0);
    const token = await signEntity("STAFF-001", { currentTime: tokenTime });

    await expect(
      decodeTokenOrThrow(token, {
        currentTime: new Date(2026, 5, 4, 10, 34, 0, 0),
        maxAgeMinutes: 30,
      }),
    ).resolves.toBe("STAFF-001");
  });

  it("keeps supporting legacy time-scoped token parsing", async () => {
    const legacyToken = await signLegacyHourToken("STAFF-001", "2026060410");

    await expect(
      decodeTokenOrThrow(legacyToken, {
        currentTime: new Date(2026, 5, 4, 10, 20, 0, 0),
      }),
    ).resolves.toBe("STAFF-001");
  });
});
