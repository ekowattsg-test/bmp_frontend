import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Summarize as SummarizeIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  BlockListItem,
  LoadMoreBlockList,
} from "../common";
import HelpDialog from "../common/HelpDialog";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const ALL_MOVEMENTS_VALUE = "ALL";

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
  const movementAtRaw = readFirst(item, [
    "movementAt",
    "movementDate",
    "recordDate",
    "createDate",
    "movedAt",
    "transactionDate",
    "transactionAt",
    "txDate",
    "occurredAt",
    "recordedAt",
    "dateTime",
    "date",
    "createdAt",
    "createdDate",
    "updatedAt",
    "updatedDate",
    "timestamp",
    "time",
  ]);
  const movementAtDate = safeParseDate(movementAtRaw);

  const quantity = toNumber(
    readFirst(item, [
      "qty",
      "quantity",
      "movementQty",
      "stockQty",
      "changeQty",
    ]),
  );

  const stockModifier = toNumber(
    readFirst(item, [
      "stockModifier",
      "movementModifier",
      "stockMovementModifier",
      "movementStockModifier",
    ]),
  );
  const holdModifier = toNumber(
    readFirst(item, [
      "holdModifier",
      "movementHoldModifier",
      "holdMovementModifier",
    ]),
  );

  const stockMoved = (() => {
    const v = readFirst(item, ["stockMoved", "movedStock", "stockMove"]);
    return v !== "" ? toNumber(v) : quantity * stockModifier;
  })();
  const holdMoved = (() => {
    const v = readFirst(item, ["holdMoved", "movedHold", "holdMove"]);
    return v !== "" ? toNumber(v) : quantity * holdModifier;
  })();

  const baselinedQuantity = toNumber(
    readFirst(item, ["baselinedQuantity", "baselineQuantity", "baseQty"]),
  );
  const quantityMoved = toNumber(
    readFirst(item, [
      "quantityMoved",
      "movedQty",
      "totalMoved",
      "quantityMove",
    ]),
  );
  const quantityHolded = toNumber(
    readFirst(item, [
      "quantityHolded",
      "quantityHeld",
      "holdQty",
      "heldQty",
      "quantityHold",
    ]),
  );

  // Use backend-computed values; fall back to formulas described by backend
  const currentQuantity = (() => {
    const v = readFirst(item, ["currentQuantity", "currentQty"]);
    return v !== "" ? toNumber(v) : baselinedQuantity + quantityMoved;
  })();
  const currentAvailableQuantity = (() => {
    const v = readFirst(item, [
      "currentAvailableQuantity",
      "availableQuantity",
      "availableQty",
    ]);
    return v !== ""
      ? toNumber(v)
      : baselinedQuantity + quantityMoved + quantityHolded;
  })();

  return {
    id:
      String(readFirst(item, ["id", "movementId", "stockViewId"])) ||
      `${readFirst(item, ["stockId", "stockCode"])}-${movementAtRaw}-${quantity}`,
    movementId: String(
      readFirst(item, ["movementId", "id", "stockMovementId"]),
    ),
    stockId: String(readFirst(item, ["stockId"])),
    productId: String(readFirst(item, ["productId"])),
    productName: String(
      readFirst(item, [
        "productName",
        "stockName",
        "name",
        "productDescription",
      ]),
    ),
    stockCode: String(readFirst(item, ["stockCode", "productCode", "code"])),
    stockLocation: String(
      readFirst(item, [
        "stockLocation",
        "location",
        "warehouse",
        "bin",
        "stockBin",
      ]),
    ),
    movementType: String(
      readFirst(item, [
        "movementType",
        "movementCode",
        "movementDescription",
        "type",
      ]),
    ),
    movementDescription: String(
      readFirst(item, [
        "movementDescription",
        "description",
        "remark",
        "remarks",
      ]),
    ),
    quantity,
    stockMoved,
    holdMoved,
    baselinedQuantity,
    quantityMoved,
    quantityHolded,
    currentQuantity,
    currentAvailableQuantity,
    uom: String(readFirst(item, ["uom", "unit", "unitOfMeasure"]) || ""),
    movementAtRaw,
    movementAt: movementAtDate
      ? movementAtDate.toLocaleDateString()
      : String(movementAtRaw || ""),
    movementAtTs: movementAtDate ? movementAtDate.getTime() : 0,
    reference: String(
      readFirst(item, [
        "reference",
        "ref",
        "referenceNo",
        "refNo",
        "referenceNumber",
        "docNo",
        "documentNo",
        "orderRef",
      ]) || "",
    ),
  };
};

const StockEnquiry = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();

  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState([]);

  const [stockCode, setStockCode] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [locationKeyword, setLocationKeyword] = useState("");
  const [referenceKeyword, setReferenceKeyword] = useState("");
  const [movementKeyword, setMovementKeyword] = useState(ALL_MOVEMENTS_VALUE);
  const [movementOptions, setMovementOptions] = useState([]);
  const [viewMode, setViewMode] = useState("summary");

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
    loadRows();
    loadMovementOptions();
  }, []);

  const resetFilters = () => {
    setProductKeyword("");
    setStockCode("");
    setLocationKeyword("");
    setReferenceKeyword("");
    setMovementKeyword(ALL_MOVEMENTS_VALUE);
  };

  const hasNonProductFilter =
    stockCode.trim() !== "" ||
    locationKeyword.trim() !== "" ||
    referenceKeyword.trim() !== "" ||
    movementKeyword !== ALL_MOVEMENTS_VALUE;

  const movementRows = useMemo(() => {
    const stockFilter = stockCode.trim().toLowerCase();
    const productFilter = productKeyword.trim().toLowerCase();
    const locationFilter = locationKeyword.trim().toLowerCase();
    const referenceFilter = referenceKeyword.trim().toLowerCase();
    const movementFilter = movementKeyword.trim();

    return rows
      .filter((row) => {
        const stockText = `${row.stockCode}`.toLowerCase();
        const productText = `${row.productName}`.toLowerCase();
        const referenceText = `${row.reference}`.toLowerCase();

        const stockMatch = !stockFilter || stockText.includes(stockFilter);
        const productMatch =
          !productFilter || productText.includes(productFilter);
        const locationMatch =
          !locationFilter ||
          row.stockLocation.toLowerCase().includes(locationFilter);
        const referenceMatch =
          !referenceFilter || referenceText.includes(referenceFilter);
        const movementMatch =
          movementFilter === ALL_MOVEMENTS_VALUE ||
          row.movementType === movementFilter;

        return (
          stockMatch &&
          productMatch &&
          locationMatch &&
          referenceMatch &&
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
    productKeyword,
    referenceKeyword,
    rows,
    stockCode,
  ]);

  const detailRows = useMemo(() => {
    const productMap = new Map();

    movementRows.forEach((row) => {
      const productKey = row.productId || row.productName || "unknown-product";
      const stockKey = row.stockCode || row.stockId || row.id;

      let productGroup = productMap.get(productKey);
      if (!productGroup) {
        productGroup = {
          productId: row.productId,
          productName: row.productName,
          stocks: new Map(),
        };
        productMap.set(productKey, productGroup);
      }

      let stockGroup = productGroup.stocks.get(stockKey);
      if (!stockGroup) {
        stockGroup = {
          stockId: row.stockId,
          stockCode: row.stockCode,
          stockLocation: row.stockLocation,
          baselineQuantity: row.baselinedQuantity,
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
        stockGroup.baselineQuantity = row.baselinedQuantity;
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

      let productBaselineQuantity = 0;
      let productCurrentQuantity = 0;
      let productAvailableQuantity = 0;

      const stockAndMovementRows = [];

      sortedStocks.forEach((stockGroup) => {
        const stockCurrentQuantity =
          stockGroup.baselineQuantity + stockGroup.stockMovedSum;
        const stockAvailableQuantity =
          stockCurrentQuantity + stockGroup.holdMovedSum;

        productBaselineQuantity += stockGroup.baselineQuantity;
        productCurrentQuantity += stockCurrentQuantity;
        productAvailableQuantity += stockAvailableQuantity;

        stockAndMovementRows.push({
          id: `stock-${productGroup.productId || productGroup.productName}-${stockGroup.stockCode || stockGroup.stockId}`,
          rowType: "stock",
          movementAt: "",
          productName: "",
          stockCode: stockGroup.stockCode,
          stockLocation: "",
          movementType: t("stockEnquiry.rowLabels.stockTotal"),
          baselinedQuantity: "",
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
            reference: movementRow.reference,
            productName: "",
            stockCode: "",
            stockLocation: movementRow.stockLocation,
            movementType:
              movementRow.movementDescription || movementRow.movementType,
            baselinedQuantity: "",
            quantityMoved: movementRow.stockMoved,
            quantityHolded: movementRow.holdMoved,
            currentQuantity: "",
            currentAvailableQuantity: "",
          });
        });
      });

      groupedRows.push({
        id: `product-${productGroup.productId || productGroup.productName}`,
        rowType: "product",
        movementAt: "",
        productName: productGroup.productName,
        stockCode: "",
        stockLocation: "",
        movementType: t("stockEnquiry.rowLabels.productTotal"),
        baselinedQuantity: productBaselineQuantity,
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
      const productKey = row.productId || row.productName || "unknown-product";
      const stockKey = row.stockCode || row.stockId || row.id;

      let productGroup = productMap.get(productKey);
      if (!productGroup) {
        productGroup = {
          productId: row.productId,
          productName: row.productName,
          uom: row.uom,
          stocks: new Map(),
        };
        productMap.set(productKey, productGroup);
      }

      let stockGroup = productGroup.stocks.get(stockKey);
      if (!stockGroup) {
        stockGroup = {
          stockId: row.stockId,
          stockCode: row.stockCode,
          stockLocation: row.stockLocation,
          baselineQuantity: row.baselinedQuantity,
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
        stockGroup.baselineQuantity = row.baselinedQuantity;
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

      let productBaselineQuantity = 0;
      let productCurrentQuantity = 0;
      let productAvailableQuantity = 0;
      let productMovementCount = 0;
      let productLastMovementAtTs = 0;
      let productLastMovementAt = "";

      const stockRows = [];

      sortedStocks.forEach((stockGroup) => {
        const stockCurrentQuantity =
          stockGroup.baselineQuantity + stockGroup.stockMovedSum;
        const stockAvailableQuantity =
          stockCurrentQuantity + stockGroup.holdMovedSum;

        productBaselineQuantity += stockGroup.baselineQuantity;
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
          baselinedQuantity: stockGroup.baselineQuantity,
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
        stockCode: "",
        stockLocation: "",
        baselinedQuantity: productBaselineQuantity,
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
      },
      {
        field: "stockCode",
        headerName: t("stockEnquiry.columns.stockCode"),
        width: 110,
      },
      {
        field: "stockLocation",
        headerName: t("stockEnquiry.columns.location"),
        width: 120,
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
      },
      {
        field: "movementType",
        headerName: t("stockEnquiry.columns.movement"),
        flex: 1,
      },
      {
        field: "baselinedQuantity",
        headerName: t("stockEnquiry.columns.baselinedQuantity"),
        width: 100,
        headerAlign: "right",
        align: "right",
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
      },
      {
        field: "stockCode",
        headerName: t("stockEnquiry.columns.stockCode"),
        width: 140,
      },
      {
        field: "baselinedQuantity",
        headerName: t("stockEnquiry.columns.baselinedQuantity"),
        width: 140,
        headerAlign: "right",
        align: "right",
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
  const tableColumns = viewMode === "summary" ? summaryColumns : detailColumns;

  const blockColumnDefs = tableColumns.map((column) => ({
    field: column.field,
    label: column.headerName,
  }));

  return (
    <Box>
      <PageHeader
        title={t("stockEnquiry.title")}
        subtitle={t("stockEnquiry.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={AssessmentIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockEnquiry.helpTitle")}
        content={t("stockEnquiry.helpBody")}
      />

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
            <MenuItem value={ALL_MOVEMENTS_VALUE}>All</MenuItem>
            {movementOptions.map((option) => (
              <MenuItem key={option.movementType} value={option.movementType}>
                {option.movementDescription || option.movementType}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

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

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <LoadingState message={t("stockEnquiry.loading")} />
      ) : tableRows.length === 0 ? (
        <EmptyState
          icon={AssessmentIcon}
          title={t("stockEnquiry.emptyTitle")}
          description={t("stockEnquiry.emptyDescription")}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={tableRows}
          renderItem={(row) => (
            <BlockListItem
              key={row.id}
              item={row}
              columnDefs={blockColumnDefs}
              t={t}
              enableActions={false}
              leadingMedia={{
                placeholder: (
                  <AssessmentIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
            />
          )}
        />
      ) : (
        <Paper
          elevation={1}
          sx={{
            backgroundColor: "background.paper",
            border: "1px solid var(--color-gray-200)",
            borderRadius: 2,
          }}
        >
          <DataGrid
            autoHeight
            density={viewMode === "detail" ? "compact" : "standard"}
            rows={tableRows}
            columns={tableColumns}
            getRowId={(row) => row.id}
            getRowClassName={(params) =>
              `stock-enquiry-row-${params.row.rowType || "movement"}`
            }
            initialState={{
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            disableColumnSorting
            sx={{
              border: 0,
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .stock-enquiry-row-product": {
                backgroundColor: "background.default",
                "& .MuiDataGrid-cell": {
                  fontWeight: 700,
                },
              },
              "& .stock-enquiry-row-stock": {
                backgroundColor: "action.hover",
                "& .MuiDataGrid-cell": {
                  fontWeight: 600,
                },
              },
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default StockEnquiry;
