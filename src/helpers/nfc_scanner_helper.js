import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeScannedValue } from "./camera_scanner_helper";

/**
 * Detect whether the Web NFC API is available in the current browser.
 */
export const isNfcSupported = () =>
  typeof window !== "undefined" && "NDEFReader" in window;

/**
 * Decode raw bytes to a UTF-8 string.
 */
const decodeRaw = (record) => {
  if (!record?.data) return "";
  try {
    const buffer = record.data.buffer ?? record.data;
    const bytes = new Uint8Array(
      buffer,
      record.data.byteOffset || 0,
      record.data.byteLength,
    );
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
};

/**
 * URI identifier codes used in NDEF URI records.
 */
const URI_PREFIXES = {
  0x00: "",
  0x01: "http://www.",
  0x02: "https://www.",
  0x03: "http://",
  0x04: "https://",
  0x05: "tel:",
  0x06: "mailto:",
};

/**
 * Decode a URL/URI record payload manually. NDEF URI records start with a
 * single prefix byte followed by the remaining URI characters.
 */
const decodeUriRecord = (record) => {
  if (!record?.data) return "";
  try {
    const bytes = new Uint8Array(
      record.data.buffer ?? record.data,
      record.data.byteOffset || 0,
      record.data.byteLength,
    );
    if (bytes.length === 0) return "";
    const prefix = URI_PREFIXES[bytes[0]] ?? "";
    const rest = new TextDecoder("utf-8").decode(bytes.slice(1));
    return prefix + rest;
  } catch {
    return "";
  }
};

/**
 * Recursively extract the first readable string from an NDEF message.
 * Handles text, url, smart-poster, mime, and external records.
 */
const extractNdefText = (message, depth = 0) => {
  if (!message?.records || depth > 3) return "";

  for (const record of message.records) {
    if (!record) continue;
    const type = String(record.recordType || "").toLowerCase();

    try {
      if (type === "text") {
        if (typeof record.toText === "function") {
          const text = record.toText();
          if (text) return text;
        }
        const decoded = decodeRaw(record);
        if (decoded) return decoded;
        // NDEF text record payload starts with status byte + lang-code length + lang code.
        // After those bytes, the actual text begins.
        const bytes = new Uint8Array(
          record.data.buffer ?? record.data,
          record.data.byteOffset || 0,
          record.data.byteLength,
        );
        if (bytes.length > 0) {
          const langCodeLength = bytes[0] & 0x3f;
          const textStart = 1 + langCodeLength;
          return new TextDecoder("utf-8").decode(bytes.slice(textStart));
        }
        return "";
      }

      if (type === "url" || type === "uri") {
        if (typeof record.toText === "function") {
          const text = record.toText();
          if (text) return text;
        }
        const decoded = decodeUriRecord(record);
        if (decoded) return decoded;
        return decodeRaw(record);
      }

      if (type === "smart-poster") {
        if (typeof record.toRecords === "function") {
          const nested = record.toRecords();
          if (nested?.length) {
            const text = extractNdefText({ records: nested }, depth + 1);
            if (text) return text;
          }
        }
        continue;
      }

      // MIME / JSON / external / unknown — try common decoders.
      if (typeof record.toText === "function") {
        const text = record.toText();
        if (text) return text;
      }
      if (typeof record.toJSON === "function") {
        const obj = record.toJSON();
        if (obj != null) return JSON.stringify(obj);
      }
      const raw = decodeRaw(record);
      if (raw) return raw;
    } catch (err) {
      console.warn("NFC record extraction error", type, err);
    }
  }

  return "";
};

/**
 * useNfcScanner — shared hook that provides Web NFC tag reading.
 *
 * @param {object} options
 * @param {function} options.onScan   Called with the normalised scanned string.
 * @param {boolean}  [options.normalize=true]  Apply QR/URL normalisation to the tag payload.
 *
 * Returns { nfcSupported, nfcScanning, startNfc, stopNfc }
 */
export function useNfcScanner({ onScan, normalize = true }) {
  const { t } = useTranslation();
  const [nfcScanning, setNfcScanning] = useState(false);
  const abortRef = useRef(null);
  const onScanRef = useRef(onScan);

  // Keep ref current without adding onScan to effect deps.
  onScanRef.current = onScan;

  const stopNfc = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // Ignore abort errors.
      }
      abortRef.current = null;
    }
    setNfcScanning(false);
  }, []);

  const startNfc = useCallback(async () => {
    if (!isNfcSupported()) {
      alert(t("stockTake.nfcNotSupported", "NFC not supported"));
      return;
    }
    stopNfc();
    setNfcScanning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Request NFC permission when the browser supports the permission query.
      if ("permissions" in navigator) {
        try {
          const status = await navigator.permissions.query({ name: "nfc" });
          if (status?.state === "denied") {
            alert(t("stockTake.nfcNotSupported", "NFC permission denied"));
            stopNfc();
            return;
          }
        } catch {
          // Permission query for NFC is not supported everywhere; ignore.
        }
      }

      const ndef = new window.NDEFReader();

      const handleReading = (event) => {
        try {
          const message = event?.message;
          console.log("NFC reading event", {
            serialNumber: event?.serialNumber,
            recordCount: message?.records?.length,
            types: message?.records?.map((r) => r?.recordType),
            records: message?.records?.map((r) => ({
              type: r?.recordType,
              mediaType: r?.mediaType,
              encoding: r?.encoding,
              lang: r?.lang,
              dataLength: r?.data?.byteLength,
              toText: typeof r?.toText,
              toRecords: typeof r?.toRecords,
              toJSON: typeof r?.toJSON,
            })),
          });

          const raw = extractNdefText(message);
          console.log("NFC extracted value", raw);

          if (!raw) {
            alert(
              t("stockTake.nfcFailed", "NFC tag contained no readable text"),
            );
            return;
          }

          const value = normalize
            ? normalizeScannedValue(raw)
            : String(raw).trim();
          if (!value) {
            alert(t("stockTake.nfcFailed", "NFC tag data could not be parsed"));
            return;
          }

          stopNfc();
          onScanRef.current?.(value);
        } catch (err) {
          console.error("NFC read error", err);
          alert(t("stockTake.nfcFailed", "Failed to read NFC tag"));
        }
      };

      const handleReadingError = (event) => {
        console.error("NFC readingerror event", event);
        // readingerror can fire when the tag is present but NDEF is unreadable.
        // Keep scanning so the user can try repositioning the tag.
        alert(t("stockTake.nfcFailed", "Could not read NFC tag. Try again."));
      };

      ndef.addEventListener("reading", handleReading);
      ndef.addEventListener("readingerror", handleReadingError);

      try {
        await ndef.scan({ signal: controller.signal });
      } catch (scanErr) {
        // Some older Chrome versions do not support the signal option.
        if (
          scanErr?.message?.includes("signal") ||
          scanErr?.name === "TypeError"
        ) {
          await ndef.scan();
        } else {
          throw scanErr;
        }
      }
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "NotAllowedError") {
        stopNfc();
        return;
      }
      console.error("Failed to start NFC scanner", err);
      alert(t("stockTake.nfcFailed", "Failed to start NFC scanner"));
      stopNfc();
    }
  }, [normalize, stopNfc, t]);

  // Stop scanning when the host component unmounts.
  useEffect(() => {
    return () => stopNfc();
  }, [stopNfc]);

  return {
    nfcSupported: isNfcSupported(),
    nfcScanning,
    startNfc,
    stopNfc,
  };
}
