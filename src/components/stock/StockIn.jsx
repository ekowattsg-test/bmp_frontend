import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { PageHeader, ProductInfoCard } from "../common";
import HelpDialog from "../common/HelpDialog";
import Modal from "../common/Modal";
import {
  getDisplayImageInfo,
  normalizeFileMetadata,
  uploadFileToDrive,
  commit,
  abort,
} from "../../helpers/file_helper";
import {
  buildUniqueOptionObjects,
  findOptionByValue,
  resolveStockLocationLimit,
  isLocationCreationDisabled,
  buildLocationSuggestions,
  DEFAULT_UOM_OPTIONS,
} from "../../helpers/common_options_helper";
import FileGallery from "../common/FileGallery";
import StockCodeScanInput from "./StockCodeScanInput";

const { maxLocations: STOCKIN_MAX_LOCATIONS } = resolveStockLocationLimit(
  import.meta.env.VITE_STOCK_MAX_LOCATION,
);

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

const readFirst = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
      return row[key];
    }
  }
  return "";
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const safeParseDate = (raw) => {
  if (!raw) return null;
  const normalized = typeof raw === "string" ? raw.replace(" ", "T") : raw;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
};

const getProductDetails = (item = {}) => {
  const nested = item.product || {};
  return {
    productId: String(
      readFirst(item, ["productId", "product_id"]) ||
        nested.productId ||
        nested.id,
    ),
    productName: String(
      readFirst(item, [
        "productName",
        "name",
        "productDescription",
        "productNameEn",
      ]) ||
        nested.productName ||
        nested.name ||
        nested.productNameEn ||
        "",
    ),
    productPicture:
      readFirst(item, [
        "productPicture",
        "productImage",
        "imageUrl",
        "productPictureUrl",
      ]) ||
      nested.productPicture ||
      nested.imageUrl ||
      nested.productImage ||
      nested.productPictureUrl ||
      "",
    uom: String(
      readFirst(item, ["uom", "unit", "unitOfMeasure"]) || nested.uom || "",
    ),
  };
};

const normalizeStock = (item, fallbackCode) => {
  const product = getProductDetails(item);
  const stockId = String(readFirst(item, ["stockId", "id"]));
  const location = String(
    readFirst(item, [
      "location",
      "stockLocation",
      "warehouse",
      "bin",
      "stockBin",
    ]) || "central",
  );

  return {
    key: `${stockId || ""}|${location || "central"}`,
    stockId,
    stockCode: String(
      readFirst(item, ["stockCode", "code", "stock_code"]) || fallbackCode,
    ),
    location,
    productId: product.productId,
    productName: product.productName,
    productPicture: product.productPicture,
    uom: product.uom,
    currentQuantity: toNumber(
      readFirst(item, [
        "currentQuantity",
        "quantity",
        "currentQty",
      ]),
    ),
    availableQuantity: toNumber(
      readFirst(item, [
        "currentAvailableQuantity",
        "availableQuantity",
        "availableQty",
      ]),
    ),
  };
};

const getProductThumb = (stock) => {
  if (!stock?.productPicture) return { imageUrl: "", meta: null };
  let parsed = stock.productPicture;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = stock.productPicture;
    }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return getDisplayImageInfo(parsed[0]);
  }
  return getDisplayImageInfo(parsed);
};

const enrichRowsWithProduct = (rows, productData) => {
  if (!productData) return rows;
  const product = getProductDetails(productData);
  return rows.map((row) => ({
    ...row,
    productId: row.productId || product.productId,
    productName: row.productName || product.productName,
    productPicture: row.productPicture || product.productPicture,
    uom: row.uom || product.uom,
  }));
};

const toObjectArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

const sanitizeWebhookUrl = (rawUrl) => {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    // Keep best-effort behavior for non-URL strings while removing query/hash suffix.
    return value.split(/[?#]/)[0].replace(/\/$/, "");
  }
};

const getN8nBaseWebhookUrl = () =>
  sanitizeWebhookUrl(import.meta.env.VITE_N8N_STOCK_MATCH_URL || "");

const getN8nSecret = () => String(import.meta.env.VITE_N8N_SECRET || "").trim();

const getN8nHeaderName = () =>
  String(import.meta.env.VITE_N8N_HEADER_NAME || "X-N8N-Token").trim();

const parseResponsePayload = async (response) => {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const fetchAndUploadN8nProductImage = async (codeToUse, sessionId = null) => {
  const webhookUrl = getN8nBaseWebhookUrl();
  if (!webhookUrl) return null;

  const form = new FormData();
  form.append("action", "image");
  form.append("stock", String(codeToUse || ""));
  if (sessionId) form.append("sessionId", String(sessionId));

  const secret = getN8nSecret();
  const headers = secret ? { [getN8nHeaderName()]: secret } : {};

  let response;
  try {
    response = await fetch(webhookUrl, { method: "POST", headers, body: form });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  // n8n returns the image directly as binary — upload the blob to Drive
  try {
    const blob = await response.blob();
    if (!blob || blob.size === 0) return null;
    const contentType = blob.type || "image/jpeg";
    const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
    const fileName = `product_${String(codeToUse || "image")}.${ext}`;
    const file = new File([blob], fileName, { type: contentType });
    const uploaded = await uploadFileToDrive(file, null, null);
    return normalizeFileMetadata(uploaded);
  } catch {
    // upload failed — return null
  }

  return null;
};

const postN8nStockAction = async (action, stockCode, sessionId = null) => {
  const webhookUrl = getN8nBaseWebhookUrl();
  if (!webhookUrl) {
    throw new Error("N8N stock match webhook URL is not configured.");
  }

  const form = new FormData();
  form.append("action", String(action || ""));
  form.append("stock", String(stockCode || ""));
  if (sessionId) form.append("sessionId", String(sessionId));

  const secret = getN8nSecret();
  const headers = secret ? { [getN8nHeaderName()]: secret } : {};

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: form,
  });

  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" ? payload : "");
    throw new Error(message || "Failed to contact n8n");
  }

  return payload;
};

// ── Standardised n8n response parsers ─────────────────────────────────────
// match response: { internetMatch:[{name,description}], databaseMatch:[{productId,productName}], databaseSuggest:[{productId,productName}] }
// suggest response: { productSuggest:{name,description} }
// image response: binary blob

const parseMatchResponse = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { internetMatch: [], databaseMatch: [], databaseSuggest: [] };
  }
  const toArr = (v) => (Array.isArray(v) ? v : []);
  return {
    internetMatch: toArr(payload.internetMatch),
    databaseMatch: toArr(payload.databaseMatch),
    databaseSuggest: toArr(payload.databaseSuggest),
  };
};

const parseSuggestResponse = (payload) => {
  if (!payload || typeof payload !== "object")
    return { name: "", description: "" };
  // productSuggest may be an array [{name, description}] or an object {name, description}
  const ps = Array.isArray(payload.productSuggest)
    ? payload.productSuggest[0]
    : payload.productSuggest;
  if (ps && typeof ps === "object") {
    return {
      name: String(ps.name || "").trim(),
      description: String(ps.description || "").trim(),
    };
  }
  return { name: "", description: "" };
};

// Build hint objects used by getMatchScore / isMatchedByHints from the standardised match payload
const buildHintsFromMatchResponse = (parsed) => {
  const hints = [];
  parsed.databaseMatch.forEach((item) => {
    if (item.productId)
      hints.push({
        productId: String(item.productId),
        productCode: "",
        productName: String(item.productName || "")
          .trim()
          .toLowerCase(),
        matchConfident: "high",
      });
  });
  parsed.databaseSuggest.forEach((item) => {
    if (item.productId)
      hints.push({
        productId: String(item.productId),
        productCode: "",
        productName: String(item.productName || "")
          .trim()
          .toLowerCase(),
        matchConfident: "medium",
      });
  });
  parsed.internetMatch.forEach((item) => {
    if (item.name)
      hints.push({
        productId: "",
        productCode: "",
        productName: String(item.name || "")
          .trim()
          .toLowerCase(),
        matchConfident: "low",
      });
  });
  return hints;
};

const isMatchedByHints = (candidate, hints) => {
  const candidateCode = String(candidate.productCode || "")
    .trim()
    .toLowerCase();
  const candidateName = String(candidate.productName || "")
    .trim()
    .toLowerCase();
  const candidateId = String(candidate.productId || "").trim();

  return hints.some((hint) => {
    if (hint.productId && candidateId && hint.productId === candidateId)
      return true;
    if (hint.productCode && candidateCode && hint.productCode === candidateCode)
      return true;
    if (hint.productName && candidateName && hint.productName === candidateName)
      return true;
    return false;
  });
};

const extractSuggestionName = (payload) => parseSuggestResponse(payload).name;

const extractSuggestedProduct = (payload) => {
  const parsed = parseSuggestResponse(payload);
  return { name: parsed.name, description: parsed.description, stockCode: "" };
};

const uniqueValues = (values) =>
  Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  );

const toProductCandidate = (row) => {
  const product = getProductDetails(row);
  const stockCode = String(
    readFirst(row, ["stockCode", "code", "stock_code", "productCode"]) || "",
  );

  return {
    key: product.productId || stockCode || product.productName,
    productId: product.productId,
    productCode: stockCode,
    productName: product.productName || stockCode,
    productCategory: String(
      readFirst(row, ["productCategory", "category", "productCat"]) || "",
    ).toUpperCase(),
    productClass: String(
      readFirst(row, ["productClass", "class", "productType"]) || "",
    ),
    productDescription: String(
      readFirst(row, ["productDescription", "description", "productDesc"]) ||
        "",
    ),
    productPicture: product.productPicture || "",
    uom: String(readFirst(row, ["uom", "unit", "unitOfMeasure"]) || ""),
    stockIds: uniqueValues([readFirst(row, ["stockId", "id"])]),
  };
};

const getMatchScore = (candidate, hints, scannedStockCode) => {
  const scanned = String(scannedStockCode || "")
    .trim()
    .toLowerCase();
  const candidateCode = String(candidate.productCode || "")
    .trim()
    .toLowerCase();
  const candidateName = String(candidate.productName || "")
    .trim()
    .toLowerCase();
  const candidateId = String(candidate.productId || "").trim();

  let score = 0;

  if (scanned && candidateCode === scanned) score += 120;
  else if (scanned && candidateCode.includes(scanned)) score += 60;

  hints.forEach((hint) => {
    const confidenceBoost =
      hint.matchConfident === "high"
        ? 120
        : hint.matchConfident === "medium"
          ? 80
          : 40;

    if (hint.productId && candidateId && hint.productId === candidateId)
      score += 180;
    if (hint.productCode && candidateCode) {
      if (hint.productCode === candidateCode) score += 140;
      else if (candidateCode.includes(hint.productCode)) score += 70;
    }
    if (hint.productName && candidateName) {
      if (hint.productName === candidateName) score += 100;
      else if (candidateName.includes(hint.productName)) score += 50;
    }

    if (
      (hint.productId && candidateId && hint.productId === candidateId) ||
      (hint.productCode &&
        candidateCode &&
        hint.productCode === candidateCode) ||
      (hint.productName && candidateName && hint.productName === candidateName)
    ) {
      score += confidenceBoost;
    }
  });

  return score;
};

const StockIn = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);

  const companyCodePrefix = String(userInfo?.companyId || "").trim();

  const buildPrefilledProductCode = (rawStockCode) => {
    const stockSuffix = String(rawStockCode || "").trim();
    if (!companyCodePrefix) return stockSuffix;
    if (!stockSuffix) return `${companyCodePrefix}-`;
    return `${companyCodePrefix}-${stockSuffix}`;
  };

  const [helpOpen, setHelpOpen] = useState(false);
  const matchSessionIdRef = useRef(null);
  const [stockCode, setStockCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warnMsg, setWarnMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [stocks, setStocks] = useState([]);
  const [selectedStockKey, setSelectedStockKey] = useState("");
  const [reference, setReference] = useState("");
  const [stockInQty, setStockInQty] = useState(1);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchHints, setMatchHints] = useState([]);
  const [productCandidates, setProductCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateCategory, setCandidateCategory] = useState("ALL");
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductBusy, setCreateProductBusy] = useState(false);
  const [createProductForm, setCreateProductForm] = useState({
    productCode: "",
    productName: "",
    productDescription: "",
    productCategory: "C",
    productClass: "General",
    uom: "",
  });
  const [productFiles, setProductFiles] = useState([]);
  const [productImageFetching, setProductImageFetching] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [systemLocations, setSystemLocations] = useState([]);

  useEffect(() => {
    let mounted = true;
    request("GET", "/api/stockmovements")
      .then((res) => {
        if (!mounted) return;
        setSystemLocations(buildLocationSuggestions(res?.data));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const resetStockInSession = () => {
    matchSessionIdRef.current = null;
    setStocks([]);
    setSelectedStockKey("");
    setReference("");
    setStockInQty(1);
    setMatchDialogOpen(false);
    setCreateProductOpen(false);
    setProductFiles([]);
    setProductImageFetching(false);
    setNewLocation("");
  };

  const refreshAfterSave = async (codeToUse) => {
    setSelectedStockKey("");
    setReference("");
    setStockInQty(1);
    setNewLocation("");
    try {
      const refreshed = await loadStocksForCode(codeToUse);
      setStocks(refreshed);
    } catch {
      // silent — table keeps old rows
    }
  };

  const loadStocksForCode = async (codeToUse) => {
    const response = await request(
      "GET",
      `/api/stockviews/stockcode/${encodeURIComponent(codeToUse)}`,
    );

    const normalized = toArray(response?.data)
      .map((item) => normalizeStock(item, codeToUse))
      .filter((item) => Boolean(item.stockId));

    if (normalized.length === 0) {
      return [];
    }

    const baseByStockId = new Map(
      normalized.map((item) => [item.stockId, item]),
    );
    const uniqueStocks = Array.from(baseByStockId.values());

    let locationRows = [];
    try {
      const perStockViewRows = await Promise.all(
        uniqueStocks.map(async (baseStock) => {
          try {
            const responseByStock = await request(
              "GET",
              `/api/stockviews/stock/${encodeURIComponent(baseStock.stockId)}`,
            );
            return toArray(responseByStock?.data).map((row) => ({
              row,
              fallbackStockId: baseStock.stockId,
            }));
          } catch {
            return [];
          }
        }),
      );

      const viewRows = perStockViewRows
        .flat()
        .map(({ row, fallbackStockId }) => {
          const stockId = String(
            readFirst(row, ["stockId", "id"]) || fallbackStockId,
          );
          const location = String(
            readFirst(row, [
              "stockLocation",
              "location",
              "warehouse",
              "bin",
              "stockBin",
            ]) || "central",
          );
          const movementAtTs =
            safeParseDate(
              readFirst(row, [
                "recordDate",
                "movementAt",
                "movementDate",
                "createDate",
                "createdAt",
                "updatedAt",
              ]),
            )?.getTime() || 0;

          const quantity = toNumber(
            readFirst(row, [
              "qty",
              "quantity",
              "movementQty",
              "stockQty",
              "changeQty",
            ]),
          );
          const stockModifier = toNumber(
            readFirst(row, [
              "stockModifier",
              "movementModifier",
              "stockMovementModifier",
              "movementStockModifier",
            ]),
          );
          const holdModifier = toNumber(
            readFirst(row, [
              "holdModifier",
              "movementHoldModifier",
              "holdMovementModifier",
            ]),
          );

          const stockMoved = (() => {
            const explicit = readFirst(row, [
              "stockMoved",
              "movedStock",
              "stockMove",
            ]);
            return explicit !== ""
              ? toNumber(explicit)
              : quantity * stockModifier;
          })();
          const holdMoved = (() => {
            const explicit = readFirst(row, [
              "holdMoved",
              "movedHold",
              "holdMove",
            ]);
            return explicit !== ""
              ? toNumber(explicit)
              : quantity * holdModifier;
          })();

          return {
            stockId,
            location,
            movementAtTs,
            stockMoved,
            holdMoved,
          };
        });

      const groupedByLocation = new Map();
      viewRows.forEach((row) => {
        const key = `${row.stockId || ""}|${row.location || "central"}`;
        const existing = groupedByLocation.get(key);

        if (!existing) {
          groupedByLocation.set(key, {
            key,
            stockId: row.stockId,
            location: row.location,
            stockMovedSum: 0,
            holdMovedSum: 0,
            lastMovementAtTs: row.movementAtTs,
          });
        }

        const group = groupedByLocation.get(key);
        group.stockMovedSum += row.stockMoved;
        group.holdMovedSum += row.holdMoved;

        if (row.movementAtTs >= group.lastMovementAtTs) {
          group.lastMovementAtTs = row.movementAtTs;
        }
      });

      locationRows = Array.from(groupedByLocation.values()).map((group) => {
        const baseStock = baseByStockId.get(group.stockId) || normalized[0];
        const currentQuantity = group.stockMovedSum;
        const availableQuantity = currentQuantity + group.holdMovedSum;

        return {
          key: group.key,
          stockId: group.stockId,
          stockCode: baseStock?.stockCode || codeToUse,
          location: group.location,
          productId: baseStock?.productId || "",
          productName: baseStock?.productName || "",
          productPicture: baseStock?.productPicture || "",
          uom: baseStock?.uom || "",
          currentQuantity,
          availableQuantity,
        };
      });
    } catch {
      // Fall back to stock search data if stock view rows cannot be loaded.
    }

    let finalRows = (locationRows.length > 0 ? locationRows : normalized).sort(
      (a, b) => (a.location || "").localeCompare(b.location || ""),
    );

    const hasProductInfo = finalRows.some(
      (row) => Boolean(row.productName) || Boolean(row.productPicture),
    );

    if (!hasProductInfo) {
      const candidateProductId = finalRows.find(
        (row) => row.productId,
      )?.productId;
      let backendProduct = null;

      if (candidateProductId) {
        try {
          const productRes = await request(
            "GET",
            `/api/products/${candidateProductId}`,
          );
          backendProduct = productRes?.data || null;
        } catch {
          // Product lookup failed; proceed without enrichment.
        }
      }

      if (backendProduct) {
        finalRows = enrichRowsWithProduct(finalRows, backendProduct);
      }
    }

    return finalRows;
  };

  const selectedStock = useMemo(
    () => stocks.find((item) => item.key === selectedStockKey) || null,
    [selectedStockKey, stocks],
  );

  // True when total system locations already meets the limit — no new locations can be created.
  const locationCreationDisabled = isLocationCreationDisabled(
    systemLocations.length,
    STOCKIN_MAX_LOCATIONS,
  );

  const hideScanBlock =
    Boolean(selectedStock) ||
    createProductOpen ||
    selectedStockKey === "NEW_LOCATION" ||
    selectedStockKey.startsWith("SYSLOC|");

  const selectedCandidate = useMemo(
    () =>
      productCandidates.find((item) => item.key === selectedCandidateKey) ||
      null,
    [productCandidates, selectedCandidateKey],
  );

  const filteredCandidates = useMemo(() => {
    const keyword = String(candidateSearch || "")
      .trim()
      .toLowerCase();

    return productCandidates.filter((item) => {
      if (
        candidateCategory !== "ALL" &&
        item.productCategory !== candidateCategory
      ) {
        return false;
      }

      if (!keyword) return true;

      const haystack = [
        item.productName,
        item.productCode,
        item.productDescription,
        item.productClass,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [candidateCategory, candidateSearch, productCandidates]);

  const productClassOptions = useMemo(
    () =>
      buildUniqueOptionObjects(productCandidates, (item) => item.productClass),
    [productCandidates],
  );

  const uomOptions = useMemo(() => {
    const fromCandidates = buildUniqueOptionObjects(
      productCandidates,
      (item) => item.uom,
    );
    const seen = new Set(fromCandidates.map((o) => o.value.toLowerCase()));
    return [
      ...fromCandidates,
      ...DEFAULT_UOM_OPTIONS.filter((o) => !seen.has(o.value.toLowerCase())),
    ];
  }, [productCandidates]);

  const productInfo = useMemo(() => {
    if (!stocks.length) return null;
    const first =
      stocks.find((item) => item.productName || item.productPicture) ||
      stocks[0];
    return {
      productName: first.productName,
      stockCode: first.stockCode,
      uom: first.uom,
      thumb: getProductThumb(first),
    };
  }, [stocks]);

  const loadProductCandidatesForMissingStock = async (codeToUse, hints) => {
    const response = await request("GET", "/api/stockviews");
    const allRows = toArray(response?.data);

    const grouped = new Map();

    allRows.forEach((row) => {
      const candidate = toProductCandidate(row);
      if (!candidate.key) return;

      const existing = grouped.get(candidate.key);
      if (!existing) {
        grouped.set(candidate.key, candidate);
        return;
      }

      grouped.set(candidate.key, {
        ...existing,
        productCode: existing.productCode || candidate.productCode,
        productName: existing.productName || candidate.productName,
        productCategory: existing.productCategory || candidate.productCategory,
        productClass: existing.productClass || candidate.productClass,
        productDescription:
          existing.productDescription || candidate.productDescription,
        productPicture: existing.productPicture || candidate.productPicture,
        stockIds: uniqueValues([
          ...(existing.stockIds || []),
          ...(candidate.stockIds || []),
        ]),
      });
    });

    return Array.from(grouped.values())
      .map((candidate) => ({
        ...candidate,
        n8nMatched: isMatchedByHints(candidate, hints),
        matchScore: getMatchScore(candidate, hints, codeToUse),
      }))
      .sort((a, b) => {
        if (a.n8nMatched !== b.n8nMatched) {
          return a.n8nMatched ? -1 : 1;
        }
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return String(a.productName || "").localeCompare(
          String(b.productName || ""),
        );
      });
  };

  const ensureStockForProduct = async (codeToUse, product) => {
    if (!product?.productId) {
      throw new Error(t("stockIn.productSelectionRequired"));
    }

    try {
      const stockRes = await request("POST", "/api/stocks", {
        productId: Number(product.productId),
        stockCode: codeToUse,
        createDate: new Date().toISOString(),
      });

      return String(readFirst(stockRes?.data || {}, ["stockId", "id"]) || "");
    } catch {
      // If stock already exists for this scanned code, fall back to search and reuse it.
      const existingRes = await request(
        "GET",
        `/api/stockviews/stock/code/${encodeURIComponent(codeToUse)}`,
      );

      const existingRows = toArray(existingRes?.data);
      const sameProductRow = existingRows.find(
        (item) =>
          String(readFirst(item, ["productId", "product_id"]) || "") ===
          String(product.productId),
      );
      const fallbackRow = sameProductRow || existingRows[0];
      return String(readFirst(fallbackRow || {}, ["stockId", "id"]) || "");
    }
  };

  const continueWithSelectedProduct = async (codeToUse, product) => {
    setBusy(true);
    setErrorMsg("");
    setWarnMsg("");
    setSuccessMsg("");

    try {
      await ensureStockForProduct(codeToUse, product);

      const finalRows = await loadStocksForCode(codeToUse);
      if (finalRows.length === 0) {
        throw new Error(t("stockIn.notFoundAfterCreate"));
      }

      setStocks(finalRows);
      setSelectedStockKey(finalRows[0].key);
      setMatchDialogOpen(false);
      setCreateProductOpen(false);
      setWarnMsg(t("stockIn.matchLinked"));
    } catch (error) {
      setErrorMsg(error?.message || t("stockIn.errorLookup"));
    } finally {
      setBusy(false);
    }
  };

  const openMatchDialogForStock = async (codeToUse) => {
    matchSessionIdRef.current = crypto.randomUUID();
    setMatchDialogOpen(true);
    setCreateProductOpen(false);
    setMatchLoading(true);
    setMatchError("");
    setProductCandidates([]);
    setSelectedCandidateKey("");
    setCandidateSearch("");
    setCandidateCategory("ALL");

    try {
      const matchPayload = await postN8nStockAction(
        "match",
        codeToUse,
        matchSessionIdRef.current,
      );
      const parsed = parseMatchResponse(matchPayload);
      const hints = buildHintsFromMatchResponse(parsed);
      setMatchHints(parsed.internetMatch);

      const candidates = await loadProductCandidatesForMissingStock(
        codeToUse,
        hints,
      );
      setProductCandidates(candidates);

      const dbMatchId = parsed.databaseMatch[0]?.productId
        ? String(parsed.databaseMatch[0].productId)
        : null;
      const preSelected = dbMatchId
        ? candidates.find((c) => String(c.productId) === dbMatchId)
        : null;
      setSelectedCandidateKey(
        preSelected?.key || (candidates.length > 0 ? candidates[0].key : ""),
      );
    } catch (error) {
      setMatchError(error?.message || t("stockIn.matchError"));
      try {
        const candidates = await loadProductCandidatesForMissingStock(
          codeToUse,
          [],
        );
        setProductCandidates(candidates);
        if (candidates.length > 0) {
          setSelectedCandidateKey(candidates[0].key);
        }
      } catch (candidateError) {
        setMatchError(candidateError?.message || t("stockIn.matchError"));
      }
    } finally {
      setMatchLoading(false);
    }
  };

  const handleUseMatchedProduct = async () => {
    if (!selectedCandidate) {
      setMatchError(t("stockIn.productSelectionRequired"));
      return;
    }

    await continueWithSelectedProduct(stockCode, selectedCandidate);
  };

  const handleNoMatchAndSuggest = async () => {
    setMatchError("");
    setCreateProductBusy(true);
    setProductFiles([]);
    try {
      // Step 1: get suggestion (name required before image request)
      let suggested = {};
      let suggestionName = "";
      let suggestedStockCode = stockCode;

      try {
        const suggestionPayload = await postN8nStockAction(
          "suggest",
          stockCode,
          matchSessionIdRef.current,
        );
        suggested = extractSuggestedProduct(suggestionPayload);
        suggestionName = suggested.name;
        suggestedStockCode = suggested.stockCode || stockCode;
      } catch (err) {
        setMatchError(err?.message || t("stockIn.suggestError"));
      }

      setCreateProductForm({
        productCode: buildPrefilledProductCode(suggestedStockCode),
        productName: suggestionName,
        productDescription: suggested.description || "",
        productCategory: "C",
        productClass: "General",
        uom: "",
      });
      setCreateProductOpen(true);

      // Step 2: fetch image by stock code (fire-and-forget, updates FileGallery when ready)
      if (stockCode) {
        setProductImageFetching(true);
        fetchAndUploadN8nProductImage(stockCode, matchSessionIdRef.current)
          .then((imageMetadata) => {
            if (imageMetadata) {
              setProductFiles([imageMetadata]);
            }
          })
          .catch(() => {})
          .finally(() => setProductImageFetching(false));
      }
    } finally {
      setCreateProductBusy(false);
    }
  };

  const handleBackToProductSelection = () => {
    setCreateProductOpen(false);
    setMatchError("");
    setProductFiles([]);
    setProductImageFetching(false);
    abort().catch(() => {});
  };

  const handleCreateProductAndUse = async () => {
    const todayIsoDate = new Date().toISOString().slice(0, 10);

    const payload = {
      productCode: String(createProductForm.productCode || "").trim(),
      productName: String(createProductForm.productName || "").trim(),
      productDescription: String(
        createProductForm.productDescription || "",
      ).trim(),
      productCategory: String(createProductForm.productCategory || "")
        .trim()
        .toUpperCase(),
      productClass:
        String(createProductForm.productClass || "").trim() || "General",
      uom: String(createProductForm.uom || "").trim(),
      productPicture:
        productFiles.length > 0
          ? JSON.stringify(productFiles.map((f) => normalizeFileMetadata(f)))
          : null,
    };

    if (!payload.productCode || !payload.productName) {
      setMatchError(t("stockIn.createRequired"));
      return;
    }

    if (productFiles.length === 0) {
      setMatchError(t("stockIn.imageRequired"));
      return;
    }

    if (!["A", "C"].includes(payload.productCategory)) {
      setMatchError(t("stockIn.categoryRequired"));
      return;
    }

    setCreateProductBusy(true);
    setMatchError("");
    try {
      const productRes = await request("POST", "/api/products", payload);
      const createdProduct = productRes?.data || payload;
      await commit().catch(() => {});
      await continueWithSelectedProduct(stockCode, createdProduct);
    } catch (error) {
      setMatchError(error?.message || t("stockIn.createFailed"));
    } finally {
      setCreateProductBusy(false);
    }
  };

  const handleLookup = async (inputCode) => {
    const codeToUse = String(inputCode || stockCode || "").trim();
    if (!codeToUse) return;

    setBusy(true);
    setStockCode(codeToUse);
    setErrorMsg("");
    setWarnMsg("");
    setSuccessMsg("");

    try {
      const finalRows = await loadStocksForCode(codeToUse);

      if (finalRows.length === 0) {
        setStocks([]);
        setSelectedStockKey("");
        setWarnMsg(t("stockIn.notFound"));
        await openMatchDialogForStock(codeToUse);
        return;
      }

      const hasMappedProduct = finalRows.some(
        (row) => Boolean(row.productId) || Boolean(row.productName),
      );
      if (!hasMappedProduct) {
        setStocks([]);
        setSelectedStockKey("");
        setWarnMsg(t("stockIn.notFound"));
        await openMatchDialogForStock(codeToUse);
        return;
      }

      setStocks(finalRows);
      setSelectedStockKey(finalRows[0].key);
    } catch (error) {
      setStocks([]);
      setSelectedStockKey("");
      if (error?.response?.status === 404) {
        setWarnMsg(t("stockIn.notFound"));
        await openMatchDialogForStock(codeToUse);
      } else {
        setErrorMsg(error?.message || t("stockIn.errorLookup"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const isNewLocation = selectedStockKey === "NEW_LOCATION";
    const isSysLocation = selectedStockKey.startsWith("SYSLOC|");

    if (!selectedStock && !isNewLocation && !isSysLocation) {
      setWarnMsg(t("stockIn.selectStockLine"));
      return;
    }

    if (isNewLocation && locationCreationDisabled) {
      setWarnMsg(t("stockIn.locationLimitReached"));
      return;
    }

    const ref = String(reference || "").trim();
    if (!ref) {
      setWarnMsg(t("stockIn.referenceRequired"));
      return;
    }

    const qty = Number(stockInQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setWarnMsg(t("stockIn.quantityRequired"));
      return;
    }

    if (isNewLocation && !String(newLocation || "").trim()) {
      setWarnMsg(t("stockIn.newLocationRequired"));
      return;
    }

    setSaveBusy(true);
    setErrorMsg("");
    setWarnMsg("");
    setSuccessMsg("");

    try {
      let targetStockId;
      let targetLocation;

      if (isNewLocation || isSysLocation) {
        const trimmedLocation = isNewLocation
          ? String(newLocation || "").trim()
          : selectedStockKey.slice("SYSLOC|".length);
        const productId = stocks[0]?.productId;
        const codeToUse = stocks[0]?.stockCode || stockCode;
        try {
          const newStockRes = await request("POST", "/api/stocks", {
            productId: Number(productId),
            stockCode: codeToUse,
            location: trimmedLocation,
            createDate: new Date().toISOString(),
          });
          targetStockId = Number(
            readFirst(newStockRes?.data || {}, ["stockId", "id"]),
          );
        } catch (stockErr) {
          throw new Error(stockErr?.message || t("stockIn.createStockFailed"));
        }
        targetLocation = trimmedLocation;
      } else {
        targetStockId = Number(selectedStock.stockId);
        targetLocation = selectedStock.location || "central";
      }

      await request("POST", "/api/stockmovements", {
        stockId: targetStockId,
        movementType: "I",
        quantity: qty,
        location: targetLocation,
        reference:
          ref +
          (userInfo?.firstName || userInfo?.lastName
            ? `/${[userInfo.firstName, userInfo.lastName].filter(Boolean).join(" ")}`
            : ""),
        recordDate: new Date().toISOString(),
      });

      setSuccessMsg(t("stockIn.saveSuccess"));
      await refreshAfterSave(stocks[0]?.stockCode || stockCode);
    } catch (error) {
      setErrorMsg(error?.message || t("stockIn.saveFailed"));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("stockIn.title")}
        subtitle={t("stockIn.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={DownloadIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockIn.helpTitle")}
        content={t("stockIn.helpBody")}
      />

      {!hideScanBlock && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "background.paper",
            border: "1px solid var(--color-gray-200)",
            borderRadius: 2,
          }}
        >
          <Typography sx={{ mb: 1 }}>{t("stockIn.scanHint")}</Typography>
          <StockCodeScanInput
            value={stockCode}
            onChange={setStockCode}
            onSubmit={handleLookup}
            busy={busy}
            submitLabel={t("stockIn.findStock")}
            label={t("stockIn.stockCode")}
            placeholder={t("stockIn.scanPlaceholder")}
          />
        </Paper>
      )}

      {warnMsg && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warnMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {productInfo && (
        <ProductInfoCard
          productInfo={productInfo}
          productLabel={t("stockIn.product")}
          stockCodeLabel={t("stockIn.stockCode")}
          uomLabel={t("stockIn.uom")}
        >
          <TableContainer
            sx={{
              border: "1px solid var(--color-gray-200)",
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell>{t("stockIn.columns.select")}</TableCell>
                  <TableCell>{t("stockIn.columns.location")}</TableCell>
                  <TableCell>{t("stockIn.columns.current")}</TableCell>
                  <TableCell>{t("stockIn.columns.available")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stocks.map((row) => {
                  const isSelected = row.key === selectedStockKey;
                  return (
                    <TableRow
                      key={row.key}
                      hover
                      selected={isSelected}
                      sx={{ cursor: "pointer" }}
                      onClick={() => setSelectedStockKey(row.key)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          inputProps={{
                            "aria-label": `${t("stockIn.columns.select")} ${row.location || "central"}`,
                          }}
                          onChange={() => setSelectedStockKey(row.key)}
                        />
                      </TableCell>
                      <TableCell>{row.location || "central"}</TableCell>
                      <TableCell>{row.currentQuantity}</TableCell>
                      <TableCell>{row.availableQuantity}</TableCell>
                    </TableRow>
                  );
                })}
                {/* Extra system locations — locations known in the system but not yet for this stock code */}
                {systemLocations
                  .filter((loc) => {
                    const locLower = loc.value.toLowerCase();
                    return !stocks.some(
                      (s) =>
                        (s.location || "central").toLowerCase() === locLower,
                    );
                  })
                  .map((loc) => {
                    const sysKey = `SYSLOC|${loc.value}`;
                    const isSelected = selectedStockKey === sysKey;
                    return (
                      <TableRow
                        key={sysKey}
                        hover
                        selected={isSelected}
                        sx={{ cursor: "pointer" }}
                        onClick={() => setSelectedStockKey(sysKey)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            inputProps={{
                              "aria-label": `${t("stockIn.columns.select")} ${loc.value}`,
                            }}
                            onChange={() => setSelectedStockKey(sysKey)}
                          />
                        </TableCell>
                        <TableCell>{loc.value}</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>0</TableCell>
                      </TableRow>
                    );
                  })}
                {/* New location row — hidden when location limit is reached */}
                {!locationCreationDisabled &&
                  (() => {
                    const isNewLocSelected =
                      selectedStockKey === "NEW_LOCATION";
                    return (
                      <TableRow
                        key="NEW_LOCATION"
                        hover
                        selected={isNewLocSelected}
                        sx={{ cursor: "pointer" }}
                        onClick={() => setSelectedStockKey("NEW_LOCATION")}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isNewLocSelected}
                            inputProps={{
                              "aria-label": t("stockIn.newLocation"),
                            }}
                            onChange={() => setSelectedStockKey("NEW_LOCATION")}
                          />
                        </TableCell>
                        <TableCell
                          sx={{ color: "primary.main", fontStyle: "italic" }}
                        >
                          + {t("stockIn.newLocation")}
                        </TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>0</TableCell>
                      </TableRow>
                    );
                  })()}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{
              display:
                selectedStock ||
                selectedStockKey === "NEW_LOCATION" ||
                selectedStockKey.startsWith("SYSLOC|")
                  ? "flex"
                  : "none",
            }}
          >
            {selectedStockKey === "NEW_LOCATION" && (
              <TextField
                size="small"
                label={t("stockIn.newLocationLabel")}
                placeholder={t("stockIn.newLocationPlaceholder")}
                value={newLocation}
                onChange={(event) => setNewLocation(event.target.value)}
                sx={{ minWidth: 220 }}
                required
                autoFocus
              />
            )}

            <TextField
              size="small"
              label={t("stockIn.reference")}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              sx={{ minWidth: 220 }}
              required
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                label={t("stockIn.quantity")}
                value={stockInQty}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "") {
                    setStockInQty("");
                    return;
                  }

                  const numericValue = Number(nextValue);
                  if (Number.isFinite(numericValue) && numericValue > 0) {
                    setStockInQty(nextValue);
                  }
                }}
                sx={{ width: 140 }}
              />

              {productInfo?.uom && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {productInfo.uom}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saveBusy}
              >
                {t("basic.save")}
              </Button>

              <Button
                variant="outlined"
                color="warning"
                onClick={() => {
                  setWarnMsg("");
                  setErrorMsg("");
                  setSuccessMsg("");
                  resetStockInSession();
                }}
                disabled={saveBusy}
              >
                {t("basic.cancel")}
              </Button>
            </Stack>
          </Stack>

          {successMsg && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMsg}
            </Alert>
          )}
        </ProductInfoCard>
      )}

      <Modal
        open={matchDialogOpen}
        onClose={() => {
          setMatchDialogOpen(false);
          resetStockInSession();
        }}
        title={t("stockIn.matchDialogTitle")}
        maxWidth="md"
      >
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("stockIn.matchDialogBody", { stockCode })}
          </Typography>

          {matchLoading && (
            <Alert
              severity="info"
              icon={<CircularProgress size={16} />}
              sx={{ alignItems: "center" }}
            >
              {t("stockIn.searchingMatches", { stockCode })}
            </Alert>
          )}

          {matchHints.length > 0 && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", mr: 1 }}
              >
                {t("stockIn.possibleMatches")}
              </Typography>
              {matchHints.slice(0, 8).map((hint, index) => (
                <Chip
                  key={`${hint.name || ""}-${index}`}
                  size="small"
                  label={hint.name || t("stockIn.matchHint")}
                  color="warning"
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          {matchError && <Alert severity="warning">{matchError}</Alert>}

          {!createProductOpen && (
            <>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  label={t("stockIn.productNameFilter")}
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                />
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    clickable
                    size="small"
                    label={t("common.all")}
                    color={candidateCategory === "ALL" ? "primary" : "default"}
                    onClick={() => setCandidateCategory("ALL")}
                  />
                  <Chip
                    clickable
                    size="small"
                    label={t("product.categoryA", "Asset")}
                    color={candidateCategory === "A" ? "primary" : "default"}
                    onClick={() => setCandidateCategory("A")}
                  />
                  <Chip
                    clickable
                    size="small"
                    label={t("product.categoryC", "Consumable")}
                    color={candidateCategory === "C" ? "primary" : "default"}
                    onClick={() => setCandidateCategory("C")}
                  />
                </Box>
              </Stack>

              <Divider />

              {matchLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <List
                  dense
                  sx={{
                    maxHeight: 300,
                    overflowY: "auto",
                    border: "1px solid var(--color-gray-200)",
                    borderRadius: 1,
                    bgcolor: "background.paper",
                  }}
                >
                  {filteredCandidates.map((item) => {
                    const selected = item.key === selectedCandidateKey;
                    return (
                      <ListItemButton
                        key={item.key}
                        selected={selected}
                        onClick={() => setSelectedCandidateKey(item.key)}
                        sx={{
                          borderBottom: "1px solid var(--color-gray-200)",
                          alignItems: "flex-start",
                          borderLeft: "4px solid",
                          borderLeftColor: "transparent",
                          transition:
                            "background-color 0.15s ease, border-color 0.15s ease",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                          "&.Mui-selected": {
                            bgcolor: "action.selected",
                            borderLeftColor: "primary.main",
                            boxShadow: "var(--shadow-sm)",
                          },
                          "&.Mui-selected:hover": {
                            bgcolor: "action.selected",
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                sx={{ fontWeight: selected ? 700 : 600 }}
                              >
                                {item.productName || item.productCode || "-"}
                              </Typography>
                              {selected && (
                                <Chip
                                  size="small"
                                  color="primary"
                                  label={t("stockIn.selected")}
                                />
                              )}
                              {item.n8nMatched && (
                                <Chip
                                  size="small"
                                  color="warning"
                                  label={t("stockIn.suggested")}
                                />
                              )}
                            </Box>
                          }
                          secondary={`${t("stockIn.stockCode")}: ${item.productCode || "-"}  •  ${t("product.category", "Category")}: ${item.productCategory || "-"}  •  ${t("product.productClass", "Class")}: ${item.productClass || "-"}`}
                        />
                      </ListItemButton>
                    );
                  })}
                  {!matchLoading && filteredCandidates.length === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Typography sx={{ color: "text.secondary" }}>
                        {t("stockIn.noCandidateProducts")}
                      </Typography>
                    </Box>
                  )}
                </List>
              )}

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleUseMatchedProduct}
                  disabled={
                    busy || createProductBusy || filteredCandidates.length === 0
                  }
                >
                  {t("stockIn.useSelectedProduct")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleNoMatchAndSuggest}
                  disabled={busy || createProductBusy}
                >
                  {t("stockIn.noMatchButton")}
                </Button>
              </Stack>
            </>
          )}

          {createProductOpen && (
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 600 }}>
                {t("stockIn.createProductTitle")}
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  size="small"
                  label={t("product.productCode", "Product Code")}
                  value={createProductForm.productCode}
                  onChange={(event) =>
                    setCreateProductForm((prev) => ({
                      ...prev,
                      productCode: event.target.value,
                    }))
                  }
                  fullWidth
                  required
                />
                <TextField
                  size="small"
                  label={t("product.productName", "Product Name")}
                  value={createProductForm.productName}
                  onChange={(event) =>
                    setCreateProductForm((prev) => ({
                      ...prev,
                      productName: event.target.value,
                    }))
                  }
                  fullWidth
                  required
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>{t("product.category", "Category")}</InputLabel>
                  <Select
                    value={createProductForm.productCategory}
                    label={t("product.category", "Category")}
                    onChange={(event) =>
                      setCreateProductForm((prev) => ({
                        ...prev,
                        productCategory: event.target.value,
                      }))
                    }
                  >
                    <MenuItem value="A">
                      {t("product.categoryA", "Asset")}
                    </MenuItem>
                    <MenuItem value="C">
                      {t("product.categoryC", "Consumable")}
                    </MenuItem>
                  </Select>
                </FormControl>
                <Autocomplete
                  freeSolo
                  openOnFocus
                  options={productClassOptions}
                  value={
                    findOptionByValue(
                      productClassOptions,
                      createProductForm.productClass,
                    ) ?? null
                  }
                  inputValue={createProductForm.productClass}
                  onInputChange={(_, newInputValue, reason) => {
                    if (reason === "reset") return;
                    setCreateProductForm((prev) => ({
                      ...prev,
                      productClass: newInputValue,
                    }));
                  }}
                  onChange={(_, newValue) => {
                    if (typeof newValue === "string") {
                      setCreateProductForm((prev) => ({
                        ...prev,
                        productClass: newValue,
                      }));
                      return;
                    }

                    if (newValue && typeof newValue === "object") {
                      setCreateProductForm((prev) => ({
                        ...prev,
                        productClass: newValue.value || "",
                      }));
                      return;
                    }

                    setCreateProductForm((prev) => ({
                      ...prev,
                      productClass: "",
                    }));
                  }}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.value
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label={t("product.productClass", "Class")}
                      fullWidth
                    />
                  )}
                  fullWidth
                />
              </Stack>

              <Autocomplete
                freeSolo
                openOnFocus
                options={uomOptions}
                value={
                  findOptionByValue(uomOptions, createProductForm.uom) ?? null
                }
                inputValue={createProductForm.uom}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === "reset") return;
                  setCreateProductForm((prev) => ({
                    ...prev,
                    uom: newInputValue,
                  }));
                }}
                onChange={(_, newValue) => {
                  if (typeof newValue === "string") {
                    setCreateProductForm((prev) => ({
                      ...prev,
                      uom: newValue,
                    }));
                    return;
                  }
                  if (newValue && typeof newValue === "object") {
                    setCreateProductForm((prev) => ({
                      ...prev,
                      uom: newValue.value || "",
                    }));
                    return;
                  }
                  setCreateProductForm((prev) => ({ ...prev, uom: "" }));
                }}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : option.value
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label={t("product.uom", "Unit of Measure")}
                    placeholder={t(
                      "product.uomPlaceholder",
                      "e.g. pcs, kg, box",
                    )}
                    fullWidth
                  />
                )}
                fullWidth
              />

              <TextField
                size="small"
                label={t("product.productDescription", "Description")}
                value={createProductForm.productDescription}
                onChange={(event) =>
                  setCreateProductForm((prev) => ({
                    ...prev,
                    productDescription: event.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={2}
              />

              {productImageFetching && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    {t("stockIn.fetchingImage", "Fetching product image…")}
                  </Typography>
                </Stack>
              )}

              <FileGallery
                productPicture={productFiles}
                allowRemove={true}
                allowAdd={true}
                repoConfig={null}
                onChange={(json) => {
                  try {
                    const parsed = json ? JSON.parse(json) : [];
                    const arr = Array.isArray(parsed) ? parsed : [parsed];
                    const norm = arr.map((p) => normalizeFileMetadata(p));
                    if (JSON.stringify(norm) !== JSON.stringify(productFiles)) {
                      setProductFiles(norm);
                    }
                  } catch {
                    // ignore parse errors
                  }
                }}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleCreateProductAndUse}
                  disabled={createProductBusy || busy || productImageFetching}
                  startIcon={
                    productImageFetching ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                >
                  {t("stockIn.saveProductAndContinue")}
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleBackToProductSelection}
                  disabled={createProductBusy || busy}
                >
                  {t("basic.back")}
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Modal>
    </Box>
  );
};

export default StockIn;
