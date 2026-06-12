import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Summarize as SummarizeIcon,
  ViewList as ViewListIcon,
  Clear as ClearIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { request } from "../../helpers/axios_helper";
import {
  getDisplayImageInfo,
  ImageCarousel,
  ThumbnailImg,
} from "../../helpers/file_helper";
import { PageHeader, LoadingState, EmptyState } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const ALL_MOVEMENTS_VALUE = "ALL";
// `readFirst` removed: use canonical backend field names directly.

const buildImages = (pic) => {
  if (!pic) return [];

  let parsed = pic;
  if (typeof pic === "string") {
    try {
      parsed = JSON.parse(pic);
    } catch {
      parsed = pic;
    }
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr
    .map((p) => getDisplayImageInfo(p))
    .filter((info) => info && (info.imageUrl || info.meta?.id))
    .map((info) => ({
      displayUrl: info.imageUrl || null,
      viewUrl: info.meta?.viewUrl || null,
      title: info.meta?.name || "",
      provider: info.meta?.provider || null,
      meta: info.meta || null,
    }));
};

const resolveInlineImageSrc = (pic, firstImage) => {
  if (firstImage?.displayUrl) return firstImage.displayUrl;
  if (typeof pic !== "string") return null;

  const str = pic.trim();
  if (str.startsWith("data:")) return str;
  if (/^[A-Za-z0-9+\/=\r\n]+$/.test(str) && str.length > 100) {
    return `data:image/png;base64,${str}`;
  }

  return null;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const safeParseDate = (raw) => {
  if (!raw) return null;
  // Handle "YYYY-MM-DD HH:mm:ss" (space separator) which some backends send
  const normalised = typeof raw === "string" ? raw.replace(" ", "T") : raw;
  const d = new Date(normalised);
  return Number.isFinite(d.getTime()) ? d : null;
};

const normalizeRow = (item) => {
  const movementAtRaw =
    item.recordDate ||
    item.movementAt ||
    item.movementDate ||
    item.createDate ||
    item.createdAt ||
    item.updatedAt ||
    "";
  const movementAtDate = safeParseDate(movementAtRaw);

  const quantity = toNumber(item.qty || item.quantity || 0);

  const stockModifier = toNumber(item.stockModifier || 0);
  const holdModifier = toNumber(item.holdModifier || 0);

  const stockMoved = (() => {
    const v = item.stockMoved;
    return v !== undefined && v !== null && v !== ""
      ? toNumber(v)
      : quantity * stockModifier;
  })();
  const holdMoved = (() => {
    const v = item.holdMoved;
    return v !== undefined && v !== null && v !== ""
      ? toNumber(v)
      : quantity * holdModifier;
  })();

  const quantityMoved = toNumber(item.quantityMoved || 0);
  const quantityHolded = toNumber(item.quantityHolded || 0);

  // Use backend-computed values; prefer canonical fields.
  const currentQuantity =
    item.currentQuantity !== undefined && item.currentQuantity !== null
      ? toNumber(item.currentQuantity)
      : quantityMoved;
  const currentAvailableQuantity =
    item.currentAvailableQuantity !== undefined &&
    item.currentAvailableQuantity !== null
      ? toNumber(item.currentAvailableQuantity)
      : quantityMoved + quantityHolded;

  return {
    id:
      String(item.id || item.movementId || item.stockViewId) ||
      `${String(item.stockId || item.stockCode || "")} - ${movementAtRaw} - ${quantity}`,
    movementId: String(
      item.movementId || item.id || item.stockMovementId || "",
    ),
    stockId: String(item.stockId || ""),
    productId: String(item.productId || ""),
    productName: String(item.productName || ""),
    productDescription: String(item.productDescription || ""),
    productImage:
      item.productPicture ||
      item.productImage ||
      item.imageUrl ||
      item.image ||
      item.photo ||
      item.productPhoto ||
      "",
    stockCode: String(item.stockCode || ""),
    stockLocation: String(
      item.location ||
        item.stockLocation ||
        item.warehouse ||
        item.bin ||
        item.stockBin ||
        "",
    ),
    movementType: String(item.movementType || ""),
    movementDescription: String(item.movementDescription || ""),
    quantity,
    stockMoved,
    holdMoved,
    quantityMoved,
    quantityHolded,
    currentQuantity,
    currentAvailableQuantity,
    uom: String(item.uom || ""),
    movementAtRaw,
    movementAt: movementAtDate
      ? movementAtDate.toLocaleDateString()
      : String(movementAtRaw || ""),
    movementAtTs: movementAtDate ? movementAtDate.getTime() : 0,
    reference: String(item.reference || ""),
    actionBy: String(item.actionBy || ""),
  };
};

const StockCard = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const location = useLocation();
  const isNarrowScreen = useMediaQuery(theme.breakpoints.down("md"));
  const queryPda = new URLSearchParams(location.search).get("pda") === "1";
  const effectivePda = queryPda || isNarrowScreen ? 1 : 0;

  const [helpOpen, setHelpOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState([]);

  const [stockCode, setStockCode] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [locationKeyword, setLocationKeyword] = useState("");
  const [referenceKeyword, setReferenceKeyword] = useState("");
  const [actionByKeyword, setActionByKeyword] = useState("");
  const [movementKeyword, setMovementKeyword] = useState(ALL_MOVEMENTS_VALUE);
  const [movementOptions, setMovementOptions] = useState([]);
  const [viewMode, setViewMode] = useState("summary");
  const [pda, setPda] = useState(0);
  const [pdaProductOptions, setPdaProductOptions] = useState([]);
  const [pdaSelectedProductKey, setPdaSelectedProductKey] = useState("");
  const [expandedLocationKeys, setExpandedLocationKeys] = useState({});

  const loadRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await request("GET", "/api/stockviews");
      const normalized = toArray(response)
        .map(normalizeRow)
        .filter(
          (row) =>
            row.stockCode ||
            row.productName ||
            row.stockLocation ||
            row.movementId,
        );
      setRows(normalized);
    } catch (error) {
      setRows([]);
      setErrorMsg(error?.message || t("stockEnquiry.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const loadRowsByStockCode = async (inputCode) => {
    const codeToUse = String(inputCode || "").trim();
    if (!codeToUse) return;

    setLoading(true);
    setStockCode(codeToUse);
    setErrorMsg("");
    try {
      const response = await request(
        "GET",
        `/api/stockviews/stockcode/${encodeURIComponent(codeToUse)}`,
      );
      const normalized = toArray(response?.data)
        .map(normalizeRow)
        .filter(
          (row) =>
            row.stockCode ||
            row.productName ||
            row.stockLocation ||
            row.movementId,
        );

      setRows(normalized);
      if (normalized.length === 0) {
        setErrorMsg(
          t("stockOut.notFound", "Stock code not found. Please scan again."),
        );
        return;
      }

      setViewMode("detail");
    } catch (error) {
      setRows([]);
      if (error?.response?.status === 404) {
        setErrorMsg(
          t("stockOut.notFound", "Stock code not found. Please scan again."),
        );
      } else {
        setErrorMsg(error?.message || t("stockEnquiry.errorLoading"));
      }
    } finally {
      setLoading(false);
    }
  };

  const getPdaProductKey = (row) =>
    String(row?.productId || row?.productName || row?.productCode || "").trim();

  const buildPdaProductOptions = (normalizedRows) => {
    const unique = new Map();

    normalizedRows.forEach((row) => {
      const key = getPdaProductKey(row);
      if (!key) return;

      if (!unique.has(key)) {
        unique.set(key, {
          key,
          productId: row.productId || "",
          productName: row.productName || row.productCode || key,
          productImage: row.productImage || "",
        });
        return;
      }

      const existing = unique.get(key);
      if (!existing.productImage && row.productImage) {
        existing.productImage = row.productImage;
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      String(a.productName || "").localeCompare(String(b.productName || "")),
    );
  };

  const loadPdaProductInventory = async (codeToUse, productKey) => {
    if (!codeToUse || !productKey) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const selectedOption = pdaProductOptions.find(
        (option) => option.key === productKey,
      );
      const productId = selectedOption?.productId || productKey;

      const response = await request(
        "GET",
        `/api/stockviews/product/${encodeURIComponent(productId)}`,
      );
      const normalized = toArray(response?.data)
        .map(normalizeRow)
        .filter(
          (row) =>
            row.stockCode ||
            row.productName ||
            row.stockLocation ||
            row.movementId,
        );

      setRows(normalized);
      setPdaSelectedProductKey(productKey);
      if (normalized.length === 0) {
        setErrorMsg(
          t(
            "stockEnquiry.emptyDescription",
            "No inventory records found for the selected product.",
          ),
        );
        return;
      }

      setViewMode("detail");
    } catch (error) {
      setRows([]);
      setErrorMsg(error?.message || t("stockEnquiry.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const handlePdaLookup = async (inputCode) => {
    const codeToUse = String(inputCode || stockCode || "").trim();
    if (!codeToUse) return;

    setLoading(true);
    setStockCode(codeToUse);
    setErrorMsg("");
    setRows([]);
    setPdaProductOptions([]);
    setPdaSelectedProductKey("");
    try {
      const response = await request(
        "GET",
        `/api/stockviews/stockcode/${encodeURIComponent(codeToUse)}`,
      );
      const normalized = toArray(response?.data)
        .map(normalizeRow)
        .filter(
          (row) =>
            row.stockCode ||
            row.productName ||
            row.stockLocation ||
            row.movementId,
        );

      const options = buildPdaProductOptions(normalized);
      setPdaProductOptions(options);

      if (options.length === 0) {
        setErrorMsg(
          t("stockOut.notFound", "Stock code not found. Please scan again."),
        );
        setLoading(false);
        return;
      }

      setStockCode("");
      const firstProductKey = options[0].key;
      setPdaSelectedProductKey(firstProductKey);
      setLoading(false);
      await loadPdaProductInventory(codeToUse, firstProductKey);
    } catch (error) {
      setRows([]);
      setLoading(false);
      if (error?.response?.status === 404) {
        setErrorMsg(
          t("stockOut.notFound", "Stock code not found. Please scan again."),
        );
      } else {
        setErrorMsg(error?.message || t("stockEnquiry.errorLoading"));
      }
    }
  };

  const loadMovementOptions = async () => {
    try {
      const response = await request("GET", "/api/stockmovementcodes");
      const movementCodes = toArray(response)
        .map((item) => ({
          movementType: String(item?.movementType || "").trim(),
          movementDescription: String(item?.movementDescription || "").trim(),
        }))
        .filter((item) => Boolean(item.movementType));

      const uniqueByType = Array.from(
        movementCodes
          .reduce((map, item) => {
            if (!map.has(item.movementType)) {
              map.set(item.movementType, item);
            }
            return map;
          }, new Map())
          .values(),
      ).sort((a, b) => a.movementType.localeCompare(b.movementType));

      setMovementOptions(uniqueByType);
    } catch {
      setMovementOptions([]);
    }
  };

  useEffect(() => {
    loadMovementOptions();

    if (effectivePda === 1) {
      setRows([]);
      setPdaProductOptions([]);
      setPdaSelectedProductKey("");
      setLoading(false);
      return;
    }

    loadRows();
  }, [effectivePda]);

  useEffect(() => {
    // PDA mode is enabled by explicit query or narrow viewport.
    setPda(effectivePda);
  }, [effectivePda]);

  useEffect(() => {
    if (pda === 1) {
      // In PDA mode, each location's movement cards start hidden.
      setExpandedLocationKeys({});
    }
  }, [pda, rows]);

  const resetFilters = () => {
    setProductKeyword("");
    setStockCode("");
    setLocationKeyword("");
    setReferenceKeyword("");
    setActionByKeyword("");
    setMovementKeyword(ALL_MOVEMENTS_VALUE);
  };

  const handleImageClick = (pic, startIndex = 0) => {
    const imgs = buildImages(pic);
    if (imgs.length === 0) return;
    setCarouselImages(imgs);
    setCarouselStart(startIndex);
    setCarouselOpen(true);
  };

  const hasNonProductFilter =
    (pda !== 1 && stockCode.trim() !== "") ||
    locationKeyword.trim() !== "" ||
    referenceKeyword.trim() !== "" ||
    actionByKeyword.trim() !== "" ||
    movementKeyword !== ALL_MOVEMENTS_VALUE;

  const movementRows = useMemo(() => {
    const stockFilter = pda === 1 ? "" : stockCode.trim().toLowerCase();
    const productFilter = productKeyword.trim().toLowerCase();
    const locationFilter = locationKeyword.trim().toLowerCase();
    const referenceFilter = referenceKeyword.trim().toLowerCase();
    const actionByFilter = actionByKeyword.trim().toLowerCase();
    const movementFilter = movementKeyword.trim();

    return rows
      .filter((row) => {
        const stockText = `${row.stockCode}`.toLowerCase();
        const productText = `${row.productName}`.toLowerCase();
        const referenceText = `${row.reference}`.toLowerCase();
        const actionByText = `${row.actionBy}`.toLowerCase();

        const stockMatch = !stockFilter || stockText.includes(stockFilter);
        const productMatch =
          !productFilter || productText.includes(productFilter);
        const locationMatch =
          !locationFilter ||
          row.stockLocation.toLowerCase().includes(locationFilter);
        const referenceMatch =
          !referenceFilter || referenceText.includes(referenceFilter);
        const actionByMatch =
          !actionByFilter || actionByText.includes(actionByFilter);
        const movementMatch =
          movementFilter === ALL_MOVEMENTS_VALUE ||
          row.movementType === movementFilter;

        return (
          stockMatch &&
          productMatch &&
          locationMatch &&
          referenceMatch &&
          actionByMatch &&
          movementMatch
        );
      })
      .sort((a, b) => {
        const productA = `${a.productName || ""}|${a.productId || ""}`
          .toLowerCase()
          .trim();
        const productB = `${b.productName || ""}|${b.productId || ""}`
          .toLowerCase()
          .trim();
        if (productA !== productB) return productA.localeCompare(productB);

        const stockA = `${a.stockCode || ""}|${a.stockId || ""}`
          .toLowerCase()
          .trim();
        const stockB = `${b.stockCode || ""}|${b.stockId || ""}`
          .toLowerCase()
          .trim();
        if (stockA !== stockB) return stockA.localeCompare(stockB);

        return b.movementAtTs - a.movementAtTs;
      });
  }, [
    locationKeyword,
    movementKeyword,
    pda,
    productKeyword,
    referenceKeyword,
    actionByKeyword,
    rows,
    stockCode,
  ]);

  const detailRows = useMemo(() => {
    const productMap = new Map();

    movementRows.forEach((row) => {
      const productKey = row.productId || "unknown-product";
      const stockKey = row.stockCode || row.stockId || row.id;

      let productGroup = productMap.get(productKey);
      if (!productGroup) {
        productGroup = {
          productId: row.productId,
          productName: row.productName,
          productImage: row.productImage,
          stocks: new Map(),
        };
        productMap.set(productKey, productGroup);
      }

      if (!productGroup.productImage && row.productImage) {
        productGroup.productImage = row.productImage;
      }

      let stockGroup = productGroup.stocks.get(stockKey);
      if (!stockGroup) {
        stockGroup = {
          stockId: row.stockId,
          stockCode: row.stockCode,
          stockLocation: row.stockLocation,
          stockMovedSum: 0,
          holdMovedSum: 0,
          lastMovementAtTs: row.movementAtTs,
          lastMovementAt: row.movementAt,
          movements: [],
        };
        productGroup.stocks.set(stockKey, stockGroup);
      }

      stockGroup.stockMovedSum += row.stockMoved;
      stockGroup.holdMovedSum += row.holdMoved;
      stockGroup.movements.push(row);

      if (row.movementAtTs >= stockGroup.lastMovementAtTs) {
        stockGroup.lastMovementAtTs = row.movementAtTs;
        stockGroup.lastMovementAt = row.movementAt;
        stockGroup.stockLocation = row.stockLocation;
      }
    });

    const sortedProductGroups = Array.from(productMap.values()).sort((a, b) => {
      const productA = `${a.productName || ""}|${a.productId || ""}`
        .toLowerCase()
        .trim();
      const productB = `${b.productName || ""}|${b.productId || ""}`
        .toLowerCase()
        .trim();
      return productA.localeCompare(productB);
    });

    const groupedRows = [];

    sortedProductGroups.forEach((productGroup) => {
      const sortedStocks = Array.from(productGroup.stocks.values()).sort(
        (a, b) => {
          const stockA = `${a.stockCode || ""}|${a.stockId || ""}`
            .toLowerCase()
            .trim();
          const stockB = `${b.stockCode || ""}|${b.stockId || ""}`
            .toLowerCase()
            .trim();
          return stockA.localeCompare(stockB);
        },
      );

      let productCurrentQuantity = 0;
      let productAvailableQuantity = 0;

      const stockAndMovementRows = [];

      sortedStocks.forEach((stockGroup) => {
        const stockCurrentQuantity = stockGroup.stockMovedSum;
        const stockAvailableQuantity =
          stockCurrentQuantity + stockGroup.holdMovedSum;

        productCurrentQuantity += stockCurrentQuantity;
        productAvailableQuantity += stockAvailableQuantity;

        stockAndMovementRows.push({
          id: `stock-${productGroup.productId || productGroup.productName}-${stockGroup.stockCode || stockGroup.stockId}`,
          rowType: "stock",
          movementAt: "",
          productName: "",
          stockCode: stockGroup.stockCode,
          stockLocation: stockGroup.stockLocation,
          movementType: t("stockEnquiry.rowLabels.stockTotal"),
          quantityMoved: stockGroup.stockMovedSum,
          quantityHolded: stockGroup.holdMovedSum,
          currentQuantity: stockCurrentQuantity,
          currentAvailableQuantity: stockAvailableQuantity,
        });

        const sortedMovements = [...stockGroup.movements].sort(
          (a, b) => b.movementAtTs - a.movementAtTs,
        );

        sortedMovements.forEach((movementRow) => {
          stockAndMovementRows.push({
            id: `movement-${movementRow.id}`,
            rowType: "movement",
            movementAt: movementRow.movementAt,
            movementAtTs: movementRow.movementAtTs,
            reference: movementRow.reference,
            productName: "",
            stockCode: "",
            stockLocation: movementRow.stockLocation,
            movementType:
              movementRow.movementDescription || movementRow.movementType,
            quantityMoved: movementRow.stockMoved,
            quantityHolded: movementRow.holdMoved,
            currentQuantity: "",
            currentAvailableQuantity: "",
            actionBy: movementRow.actionBy,
          });
        });
      });

      groupedRows.push({
        id: `product-${productGroup.productId || productGroup.productName}`,
        rowType: "product",
        movementAt: "",
        productName: productGroup.productName,
        productImage: productGroup.productImage,
        stockCode: "",
        stockLocation: "",
        movementType: t("stockEnquiry.rowLabels.productTotal"),
        quantityMoved: "",
        quantityHolded: "",
        currentQuantity: productCurrentQuantity,
        currentAvailableQuantity: productAvailableQuantity,
      });

      groupedRows.push(...stockAndMovementRows);
    });

    return groupedRows;
  }, [movementRows, t]);

  const summaryRows = useMemo(() => {
    // Build product → stocks map (same structure as detailRows but without movement lines)
    const productMap = new Map();

    movementRows.forEach((row) => {
      const productKey = row.productId || "unknown-product";
      const stockKey = row.stockCode || row.stockId || row.id;

      let productGroup = productMap.get(productKey);
      if (!productGroup) {
        productGroup = {
          productId: row.productId,
          productName: row.productName,
          productImage: row.productImage,
          uom: row.uom,
          stocks: new Map(),
        };
        productMap.set(productKey, productGroup);
      }

      if (!productGroup.productImage && row.productImage) {
        productGroup.productImage = row.productImage;
      }

      let stockGroup = productGroup.stocks.get(stockKey);
      if (!stockGroup) {
        stockGroup = {
          stockId: row.stockId,
          stockCode: row.stockCode,
          stockLocation: row.stockLocation,
          stockMovedSum: 0,
          holdMovedSum: 0,
          movementCount: 0,
          lastMovementAtTs: row.movementAtTs,
          lastMovementAt: row.movementAt,
        };
        productGroup.stocks.set(stockKey, stockGroup);
      }

      stockGroup.stockMovedSum += row.stockMoved;
      stockGroup.holdMovedSum += row.holdMoved;
      stockGroup.movementCount += 1;

      if (row.movementAtTs >= stockGroup.lastMovementAtTs) {
        stockGroup.lastMovementAtTs = row.movementAtTs;
        stockGroup.lastMovementAt = row.movementAt;
        stockGroup.stockLocation = row.stockLocation;
      }
    });

    const sortedProductGroups = Array.from(productMap.values()).sort((a, b) => {
      const productA = `${a.productName || ""}|${a.productId || ""}`
        .toLowerCase()
        .trim();
      const productB = `${b.productName || ""}|${b.productId || ""}`
        .toLowerCase()
        .trim();
      return productA.localeCompare(productB);
    });

    const groupedRows = [];

    sortedProductGroups.forEach((productGroup) => {
      const sortedStocks = Array.from(productGroup.stocks.values()).sort(
        (a, b) => {
          const stockA = `${a.stockCode || ""}|${a.stockId || ""}`
            .toLowerCase()
            .trim();
          const stockB = `${b.stockCode || ""}|${b.stockId || ""}`
            .toLowerCase()
            .trim();
          return stockA.localeCompare(stockB);
        },
      );

      let productCurrentQuantity = 0;
      let productAvailableQuantity = 0;
      let productMovementCount = 0;
      let productLastMovementAtTs = 0;
      let productLastMovementAt = "";

      const stockRows = [];

      sortedStocks.forEach((stockGroup) => {
        const stockCurrentQuantity = stockGroup.stockMovedSum;
        const stockAvailableQuantity =
          stockCurrentQuantity + stockGroup.holdMovedSum;

        productCurrentQuantity += stockCurrentQuantity;
        productAvailableQuantity += stockAvailableQuantity;
        productMovementCount += stockGroup.movementCount;

        if (stockGroup.lastMovementAtTs >= productLastMovementAtTs) {
          productLastMovementAtTs = stockGroup.lastMovementAtTs;
          productLastMovementAt = stockGroup.lastMovementAt;
        }

        stockRows.push({
          id: `sum-stock-${productGroup.productId || productGroup.productName}-${stockGroup.stockCode || stockGroup.stockId}`,
          rowType: "stock",
          productName: "",
          stockCode: stockGroup.stockCode,
          stockLocation: stockGroup.stockLocation,
          quantityMoved: stockGroup.stockMovedSum,
          quantityHolded: stockGroup.holdMovedSum,
          currentQuantity: stockCurrentQuantity,
          currentAvailableQuantity: stockAvailableQuantity,
          uom: "",
          movementCount: stockGroup.movementCount,
          lastMovementAt: stockGroup.lastMovementAt,
          lastMovementAtTs: stockGroup.lastMovementAtTs,
        });
      });

      groupedRows.push({
        id: `sum-product-${productGroup.productId || productGroup.productName}`,
        rowType: "product",
        productName: productGroup.productName,
        productImage: productGroup.productImage,
        stockCode: "",
        stockLocation: "",
        quantityMoved: "",
        quantityHolded: "",
        currentQuantity: productCurrentQuantity,
        currentAvailableQuantity: productAvailableQuantity,
        uom: productGroup.uom,
        movementCount: productMovementCount,
        lastMovementAt: productLastMovementAt,
        lastMovementAtTs: productLastMovementAtTs,
      });

      groupedRows.push(...stockRows);
    });

    return groupedRows;
  }, [movementRows]);

  const detailColumns = useMemo(
    () => [
      {
        field: "productName",
        headerName: t("stockEnquiry.columns.product"),
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          const full = `${params.row.productName || ""}${params.row.productDescription ? " — " + params.row.productDescription : ""}`;
          return (
            <Tooltip title={full} arrow enterDelay={300} leaveDelay={100}>
              <Box
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {params.value}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: "stockCode",
        headerName: t("stockEnquiry.columns.stockCode"),
        width: 110,
        renderCell: (params) => (
          <Tooltip
            title={String(params.value || params.row.stockCode || "")}
            arrow
            enterDelay={300}
            leaveDelay={100}
          >
            <Box
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        ),
      },
      {
        field: "stockLocation",
        headerName: t("stockEnquiry.columns.location"),
        width: 120,
        renderCell: (params) => (
          <Tooltip
            title={String(params.value || params.row.stockLocation || "")}
            arrow
            enterDelay={300}
            leaveDelay={100}
          >
            <Box
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        ),
      },
      {
        field: "movementAt",
        headerName: t("stockEnquiry.columns.movementAt"),
        width: 110,
      },
      {
        field: "reference",
        headerName: t("stockEnquiry.columns.reference"),
        width: 120,
        renderCell: (params) => (
          <Tooltip
            title={String(params.value || params.row.reference || "")}
            arrow
            enterDelay={300}
            leaveDelay={100}
          >
            <Box
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        ),
      },
      {
        field: "actionBy",
        headerName: t("stockEnquiry.columns.actionBy"),
        width: 120,
        renderCell: (params) => (
          <Tooltip
            title={String(params.value || params.row.actionBy || "")}
            arrow
            enterDelay={300}
            leaveDelay={100}
          >
            <Box
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        ),
      },
      {
        field: "movementType",
        headerName: t("stockEnquiry.columns.movement"),
        flex: 1,
      },
      {
        field: "quantityMoved",
        headerName: t("stockEnquiry.columns.quantityMoved"),
        width: 90,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "quantityHolded",
        headerName: t("stockEnquiry.columns.quantityHolded"),
        width: 90,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "currentQuantity",
        headerName: t("stockEnquiry.columns.currentQuantity"),
        width: 100,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "currentAvailableQuantity",
        headerName: t("stockEnquiry.columns.currentAvailableQuantity"),
        width: 110,
        headerAlign: "right",
        align: "right",
      },
    ],
    [t],
  );

  const summaryColumns = useMemo(
    () => [
      {
        field: "productName",
        headerName: t("stockEnquiry.columns.product"),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => {
          const full = `${params.row.productName || ""}${params.row.productDescription ? " — " + params.row.productDescription : ""}`;
          return (
            <Tooltip title={full} arrow enterDelay={300} leaveDelay={100}>
              <Box
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {params.value}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: "stockCode",
        headerName: t("stockEnquiry.columns.stockCode"),
        width: 140,
        renderCell: (params) => (
          <Tooltip
            title={String(params.value || params.row.stockCode || "")}
            arrow
            enterDelay={300}
            leaveDelay={100}
          >
            <Box
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.value}
            </Box>
          </Tooltip>
        ),
      },
      {
        field: "quantityMoved",
        headerName: t("stockEnquiry.columns.quantityMoved"),
        width: 130,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "quantityHolded",
        headerName: t("stockEnquiry.columns.quantityHolded"),
        width: 130,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "currentQuantity",
        headerName: t("stockEnquiry.columns.currentQuantity"),
        width: 140,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "currentAvailableQuantity",
        headerName: t("stockEnquiry.columns.currentAvailableQuantity"),
        width: 160,
        headerAlign: "right",
        align: "right",
      },
      {
        field: "uom",
        headerName: t("stockEnquiry.columns.uom"),
        width: 80,
      },
      {
        field: "lastMovementAt",
        headerName: t("stockEnquiry.columns.lastMovement"),
        flex: 1,
        minWidth: 180,
      },
    ],
    [t],
  );

  const tableRows = viewMode === "summary" ? summaryRows : detailRows;

  const cardGroups = useMemo(() => {
    const groups = [];
    let currentProduct = null;
    let currentStock = null;

    tableRows.forEach((row) => {
      if (row.rowType === "product") {
        currentProduct = { row, stocks: [] };
        currentStock = null;
        groups.push(currentProduct);
        return;
      }

      if (row.rowType === "stock") {
        if (!currentProduct) {
          currentProduct = {
            row: {
              id: `product-fallback-${row.id}`,
              rowType: "product",
              productName: t("stockEnquiry.columns.product"),
              productImage: "",
              currentQuantity: "",
              currentAvailableQuantity: "",
            },
            stocks: [],
          };
          groups.push(currentProduct);
        }

        currentStock = { row, movements: [] };
        currentProduct.stocks.push(currentStock);
        return;
      }

      if (row.rowType === "movement" && currentStock) {
        currentStock.movements.push(row);
      }
    });

    return groups;
  }, [tableRows, t]);

  const formatQty = (value) => {
    if (value === "" || value === null || value === undefined) return "-";
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : String(value);
  };

  const groupMovementsByLocation = (movements) => {
    const grouped = new Map();

    movements.forEach((movement) => {
      const key = movement.stockLocation || "-";
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(movement);
    });

    return Array.from(grouped.entries())
      .map(([location, locationMovements]) => {
        const quantityMoved = locationMovements.reduce(
          (sum, row) => sum + (Number(row.quantityMoved) || 0),
          0,
        );
        const quantityHolded = locationMovements.reduce(
          (sum, row) => sum + (Number(row.quantityHolded) || 0),
          0,
        );

        return {
          location,
          currentQuantity: quantityMoved,
          currentAvailableQuantity: quantityMoved + quantityHolded,
          movements: [...locationMovements].sort(
            (a, b) => (b.movementAtTs || 0) - (a.movementAtTs || 0),
          ),
        };
      })
      .sort((a, b) => a.location.localeCompare(b.location));
  };

  const pasteToFilter = (field, value) => {
    if (value === undefined || value === null) return;
    const v = String(value);
    if (!v) return;
    if (field === "productName") setProductKeyword(v);
    else if (field === "stockCode") setStockCode(v);
    else if (field === "stockLocation") setLocationKeyword(v);
    else if (field === "reference") setReferenceKeyword(v);
    else if (field === "actionBy") setActionByKeyword(v);
  };

  const toggleLocationExpanded = (locationKey) => {
    setExpandedLocationKeys((prev) => ({
      ...prev,
      [locationKey]: !prev[locationKey],
    }));
  };

  return (
    <Box data-pda-mode={pda}>
      {pda !== 1 && (
        <>
          <PageHeader
            title={t("stockCard.title", t("menu.stockCard", "Inventory Card"))}
            subtitle={t("stockCard.subtitle", t("stockEnquiry.subtitle"))}
            onHelpClick={() => setHelpOpen(true)}
            icon={AssessmentIcon}
          />

          <HelpDialog
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            title={t("stockCard.helpTitle", "Inventory Card - User Manual")}
            content={t("stockCard.helpBody", t("stockEnquiry.helpBody"))}
          />
        </>
      )}

      {pda === 1 ? (
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
          <Typography sx={{ mb: 1 }}>
            {t("stockOut.scanHint", "Scan or enter stock code to start")}
          </Typography>
          <StockCodeScanInput
            value={stockCode}
            onChange={setStockCode}
            onSubmit={handlePdaLookup}
            busy={loading}
            label={t("stockOut.stockCode", "Stock Code")}
            placeholder={t(
              "stockOut.scanPlaceholder",
              "Scan or enter stock code...",
            )}
            showSubmitButton={false}
            allowProductSearch
          />

          {pdaProductOptions.length > 0 && (
            <TextField
              select
              fullWidth
              size="small"
              sx={{ mt: 2 }}
              label={t("product.productName", "Product")}
              value={pdaSelectedProductKey}
              onChange={(event) => {
                const nextProductKey = event.target.value;
                setPdaSelectedProductKey(nextProductKey);
                loadPdaProductInventory(stockCode, nextProductKey);
              }}
            >
              {pdaProductOptions.map((option) => (
                <MenuItem key={option.key} value={option.key}>
                  {option.productName}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Paper>
      ) : (
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
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              label={t("stockEnquiry.filters.product")}
              value={productKeyword}
              onChange={(e) => setProductKeyword(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment:
                  productKeyword && productKeyword.trim() !== "" ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setProductKeyword("")}
                        aria-label={t("basic.clear", "Clear")}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
            />
            <TextField
              label={t("stockEnquiry.filters.stockCode")}
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment:
                  stockCode && stockCode.trim() !== "" ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setStockCode("")}
                        aria-label={t("basic.clear", "Clear")}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
            />
            <TextField
              label={t("stockEnquiry.filters.location")}
              value={locationKeyword}
              onChange={(e) => setLocationKeyword(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment:
                  locationKeyword && locationKeyword.trim() !== "" ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setLocationKeyword("")}
                        aria-label={t("basic.clear", "Clear")}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
            />
            <TextField
              label={t("stockEnquiry.filters.reference")}
              value={referenceKeyword}
              onChange={(e) => setReferenceKeyword(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment:
                  referenceKeyword && referenceKeyword.trim() !== "" ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setReferenceKeyword("")}
                        aria-label={t("basic.clear", "Clear")}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
            />
            <TextField
              label={t("stockEnquiry.filters.actionBy")}
              value={actionByKeyword}
              onChange={(e) => setActionByKeyword(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment:
                  actionByKeyword && actionByKeyword.trim() !== "" ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setActionByKeyword("")}
                        aria-label={t("basic.clear", "Clear")}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
            />
            <TextField
              label={t("stockEnquiry.filters.movement")}
              select
              value={movementKeyword}
              onChange={(e) => setMovementKeyword(e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value={ALL_MOVEMENTS_VALUE}>
                {t("basic.all", "All")}
              </MenuItem>
              {movementOptions.map((option) => (
                <MenuItem key={option.movementType} value={option.movementType}>
                  {option.movementDescription || option.movementType}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Typography variant="caption" sx={{ color: "text.secondary", mt: 1 }}>
            {t("stockEnquiry.hint.doubleClick")}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <ToggleButtonGroup
              exclusive
              value={viewMode}
              onChange={(_, next) => {
                if (next) setViewMode(next);
              }}
              size="small"
              aria-label={t("stockEnquiry.viewMode.label")}
              sx={{
                "& .MuiToggleButton-root": {
                  color: "secondary.main",
                  fontWeight: 500,
                  backgroundColor: "background.paper",
                  borderColor: "divider",
                  transition: "all 0.2s ease",
                },
                "& .MuiToggleButton-root .MuiSvgIcon-root": {
                  color: "inherit",
                },
                "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover":
                  {
                    color: "primary.main",
                    fontWeight: 700,
                    backgroundColor: "var(--color-primary-alpha-10)",
                    borderColor: "primary.main",
                  },
                "& .MuiToggleButton-root.Mui-selected .MuiSvgIcon-root, & .MuiToggleButton-root.Mui-selected:hover .MuiSvgIcon-root":
                  {
                    color: "inherit",
                  },
              }}
            >
              <ToggleButton
                value="summary"
                aria-label={t("stockEnquiry.viewMode.summary")}
              >
                <SummarizeIcon sx={{ mr: 1 }} fontSize="small" />
                {t("stockEnquiry.viewMode.summary")}
              </ToggleButton>
              <ToggleButton
                value="detail"
                aria-label={t("stockEnquiry.viewMode.detail")}
              >
                <ViewListIcon sx={{ mr: 1 }} fontSize="small" />
                {t("stockEnquiry.viewMode.detail")}
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={resetFilters}
              sx={{ textTransform: "none" }}
            >
              {t("basic.reset", "Reset")}
            </Button>

            {hasNonProductFilter && (
              <Typography
                variant="body2"
                sx={{
                  color: "warning.main",
                  fontWeight: 500,
                  alignSelf: "center",
                }}
              >
                {t("stockEnquiry.notes.filteredTotals")}
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <LoadingState message={t("stockEnquiry.loading")} />
      ) : tableRows.length === 0 ? (
        pda === 1 ? null : (
          <EmptyState
            icon={AssessmentIcon}
            title={t("stockEnquiry.emptyTitle")}
            description={t("stockEnquiry.emptyDescription")}
          />
        )
      ) : (
        <Stack spacing={2}>
          {cardGroups.map((productGroup) => (
            <Paper
              key={productGroup.row.id}
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid var(--color-gray-200)",
                backgroundColor: "background.paper",
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  {(() => {
                    const pics = buildImages(productGroup.row.productImage);
                    const firstImage = pics[0] || null;
                    const inlineSrc = resolveInlineImageSrc(
                      productGroup.row.productImage,
                      firstImage,
                    );

                    if (firstImage?.meta?.id) {
                      return (
                        <ThumbnailImg
                          fileId={firstImage.meta.id}
                          viewUrl={firstImage.meta.viewUrl || ""}
                          provider={firstImage.meta.provider || null}
                          width={38}
                          height={38}
                          alt={
                            productGroup.row.productDescription ||
                            productGroup.row.productName ||
                            t("stockEnquiry.columns.product")
                          }
                          style={{ borderRadius: 4, cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(productGroup.row.productImage, 0);
                          }}
                        />
                      );
                    }

                    if (inlineSrc) {
                      return (
                        <Box
                          component="img"
                          src={inlineSrc}
                          alt={
                            productGroup.row.productDescription ||
                            productGroup.row.productName ||
                            t("stockEnquiry.columns.product")
                          }
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 1,
                            objectFit: "cover",
                            cursor: "pointer",
                            border: "1px solid",
                            borderColor: "divider",
                            backgroundColor: "background.default",
                          }}
                          referrerPolicy="no-referrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(productGroup.row.productImage, 0);
                          }}
                        />
                      );
                    }

                    return (
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: "background.default",
                        }}
                      >
                        <AssessmentIcon
                          sx={{ color: "text.secondary", fontSize: "1.05rem" }}
                        />
                      </Box>
                    );
                  })()}

                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      onDoubleClick={() =>
                        pasteToFilter(
                          "productName",
                          productGroup.row.productName,
                        )
                      }
                      sx={{ cursor: "copy", fontWeight: 700 }}
                    >
                      {productGroup.row.productName ||
                        t("stockEnquiry.columns.product")}
                    </Typography>

                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ fontWeight: 600, fontSize: "1rem" }}
                    >
                      {`${t("stockEnquiry.columns.currentQuantity")}: ${formatQty(productGroup.row.currentQuantity)}  |  ${t("stockEnquiry.columns.currentAvailableQuantity")}: ${formatQty(productGroup.row.currentAvailableQuantity)}`}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack spacing={1.5} sx={{ pl: { xs: 0, sm: "48px" } }}>
                  {productGroup.stocks.map((stockGroup) => (
                    <Paper
                      key={stockGroup.row.id}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        backgroundColor: "background.default",
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", md: "center" }}
                          justifyContent="space-between"
                        >
                          <Typography
                            variant="subtitle1"
                            onDoubleClick={() =>
                              pasteToFilter(
                                "stockCode",
                                stockGroup.row.stockCode,
                              )
                            }
                            sx={{ cursor: "copy", fontWeight: 600 }}
                          >
                            {t("stockEnquiry.columns.stockCode")}:{" "}
                            {stockGroup.row.stockCode || "-"}
                          </Typography>
                        </Stack>

                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", md: "center" }}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 600, fontSize: "0.95rem" }}
                          >
                            {`${t("stockEnquiry.columns.currentQuantity")}: ${formatQty(stockGroup.row.currentQuantity)}  |  ${t("stockEnquiry.columns.currentAvailableQuantity")}: ${formatQty(stockGroup.row.currentAvailableQuantity)}`}
                          </Typography>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                          >
                            <Chip
                              size="small"
                              label={`${t("stockEnquiry.columns.quantityMoved")}: ${formatQty(stockGroup.row.quantityMoved)}`}
                            />
                            <Chip
                              size="small"
                              label={`${t("stockEnquiry.columns.quantityHolded")}: ${formatQty(stockGroup.row.quantityHolded)}`}
                            />
                          </Stack>
                        </Stack>

                        {viewMode === "detail" &&
                          stockGroup.movements.length > 0 && (
                            <Stack
                              spacing={1}
                              sx={{ pl: { xs: 0, md: 2 }, pt: 0.5 }}
                            >
                              {groupMovementsByLocation(
                                stockGroup.movements,
                              ).map((locationGroup) => {
                                const locationKey = `${stockGroup.row.id}-${locationGroup.location}`;
                                const isExpanded =
                                  pda === 1
                                    ? !!expandedLocationKeys[locationKey]
                                    : true;

                                return (
                                  <Paper
                                    key={locationKey}
                                    elevation={0}
                                    sx={{
                                      p: 1,
                                      borderRadius: 1.5,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      backgroundColor: "background.paper",
                                    }}
                                  >
                                    <Stack spacing={0.75}>
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                      >
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          onDoubleClick={() =>
                                            pasteToFilter(
                                              "stockLocation",
                                              locationGroup.location,
                                            )
                                          }
                                          sx={{
                                            cursor: "copy",
                                            fontWeight: 600,
                                            fontSize: "0.92rem",
                                          }}
                                        >
                                          {t("stockEnquiry.columns.location")}:{" "}
                                          {locationGroup.location}
                                        </Typography>

                                        {pda === 1 && (
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              toggleLocationExpanded(
                                                locationKey,
                                              )
                                            }
                                            aria-label={
                                              isExpanded
                                                ? t("basic.hide", "Hide")
                                                : t("basic.show", "Show")
                                            }
                                          >
                                            {isExpanded ? (
                                              <KeyboardArrowDownIcon fontSize="small" />
                                            ) : (
                                              <KeyboardArrowRightIcon fontSize="small" />
                                            )}
                                          </IconButton>
                                        )}
                                      </Stack>

                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          fontWeight: 500,
                                          fontSize: "0.9rem",
                                        }}
                                      >
                                        {`${t("stockEnquiry.columns.currentQuantity")}: ${formatQty(locationGroup.currentQuantity)}  |  ${t("stockEnquiry.columns.currentAvailableQuantity")}: ${formatQty(locationGroup.currentAvailableQuantity)}`}
                                      </Typography>

                                      {isExpanded &&
                                        locationGroup.movements.map(
                                          (movement) => (
                                            <Paper
                                              key={movement.id}
                                              elevation={0}
                                              sx={{
                                                p: 1,
                                                borderRadius: 1,
                                                border: "1px dashed",
                                                borderColor: "divider",
                                                backgroundColor:
                                                  "background.default",
                                              }}
                                            >
                                              <Stack spacing={0.5}>
                                                <Stack
                                                  direction="row"
                                                  spacing={1}
                                                  alignItems="center"
                                                  flexWrap="wrap"
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                  >
                                                    {movement.movementAt || "-"}{" "}
                                                    -{" "}
                                                    {movement.movementType ||
                                                      "-"}
                                                  </Typography>

                                                  <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`${t("stockEnquiry.columns.reference")}: ${movement.reference || "-"}`}
                                                    onDoubleClick={() =>
                                                      pasteToFilter(
                                                        "reference",
                                                        movement.reference,
                                                      )
                                                    }
                                                    sx={{ cursor: "copy" }}
                                                  />
                                                  <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`${t("stockEnquiry.columns.actionBy")}: ${movement.actionBy || "-"}`}
                                                    onDoubleClick={() =>
                                                      pasteToFilter(
                                                        "actionBy",
                                                        movement.actionBy,
                                                      )
                                                    }
                                                    sx={{ cursor: "copy" }}
                                                  />
                                                </Stack>

                                                <Typography
                                                  variant="body2"
                                                  color="text.secondary"
                                                  sx={{
                                                    fontSize: "0.9rem",
                                                    fontWeight: 500,
                                                  }}
                                                >
                                                  {`${t("stockEnquiry.columns.quantityMoved")}: ${formatQty(movement.quantityMoved)}, ${t("stockEnquiry.columns.quantityHolded")}: ${formatQty(movement.quantityHolded)}`}
                                                </Typography>
                                              </Stack>
                                            </Paper>
                                          ),
                                        )}
                                    </Stack>
                                  </Paper>
                                );
                              })}
                            </Stack>
                          )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <ImageCarousel
        open={carouselOpen}
        images={carouselImages}
        initialIndex={carouselStart}
        onClose={() => setCarouselOpen(false)}
      />
    </Box>
  );
};

export default StockCard;
