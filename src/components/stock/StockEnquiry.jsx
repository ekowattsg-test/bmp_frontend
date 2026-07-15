import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Summarize as SummarizeIcon,
  ViewList as ViewListIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon,
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

// `readFirst` removed: use canonical backend field names directly.

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
    productBrand: String(item.productBrand || ""),
    productClass: String(item.productClass || ""),
    productCategory: String(item.productCategory || ""),
    commonName: String(item.commonName || ""),
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
  const [actionByKeyword, setActionByKeyword] = useState("");
  const [movementKeyword, setMovementKeyword] = useState(ALL_MOVEMENTS_VALUE);
  const [movementOptions, setMovementOptions] = useState([]);
  const [viewMode, setViewMode] = useState("detail");

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
    setActionByKeyword("");
    setMovementKeyword(ALL_MOVEMENTS_VALUE);
  };

  const hasNonProductFilter =
    stockCode.trim() !== "" ||
    locationKeyword.trim() !== "" ||
    referenceKeyword.trim() !== "" ||
    actionByKeyword.trim() !== "" ||
    movementKeyword !== ALL_MOVEMENTS_VALUE;

  const movementRows = useMemo(() => {
    const stockFilter = stockCode.trim().toLowerCase();
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
          productDescription: row.productDescription,
          productBrand: row.productBrand,
          productClass: row.productClass,
          productCategory: row.productCategory,
          commonName: row.commonName,
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
          stockLocation: "",
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
        productDescription: productGroup.productDescription || "",
        productBrand: productGroup.productBrand || "",
        productClass: productGroup.productClass || "",
        productCategory: productGroup.productCategory || "",
        commonName: productGroup.commonName || "",
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
          productDescription: row.productDescription,
          productBrand: row.productBrand,
          productClass: row.productClass,
          productCategory: row.productCategory,
          commonName: row.commonName,
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
        productDescription: productGroup.productDescription || "",
        productBrand: productGroup.productBrand || "",
        productClass: productGroup.productClass || "",
        productCategory: productGroup.productCategory || "",
        commonName: productGroup.commonName || "",
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
          const r = params.row;
          const lines = [
            r.productName,
            r.commonName
              ? `${t("product.commonName", "Common Name")}: ${r.commonName}`
              : null,
            r.productBrand
              ? `${t("product.productBrand", "Brand")}: ${r.productBrand}`
              : null,
            r.productDescription
              ? `${t("product.productDescription", "Description")}: ${r.productDescription}`
              : null,
            r.productCategory
              ? `${t("product.productCategory", "Category")}: ${r.productCategory === "A" ? t("product.categoryA", "Asset") : r.productCategory === "C" ? t("product.categoryC", "Consumable") : r.productCategory}`
              : null,
            r.productClass
              ? `${t("product.productClass", "Class")}: ${r.productClass}`
              : null,
            r.uom ? `${t("product.uom", "UOM")}: ${r.uom}` : null,
          ].filter(Boolean);
          return (
            <Tooltip
              title={
                <Box sx={{ whiteSpace: "pre-line" }}>{lines.join("\n")}</Box>
              }
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
          const r = params.row;
          const lines = [
            r.productName,
            r.commonName
              ? `${t("product.commonName", "Common Name")}: ${r.commonName}`
              : null,
            r.productBrand
              ? `${t("product.productBrand", "Brand")}: ${r.productBrand}`
              : null,
            r.productDescription
              ? `${t("product.productDescription", "Description")}: ${r.productDescription}`
              : null,
            r.productCategory
              ? `${t("product.productCategory", "Category")}: ${r.productCategory === "A" ? t("product.categoryA", "Asset") : r.productCategory === "C" ? t("product.categoryC", "Consumable") : r.productCategory}`
              : null,
            r.productClass
              ? `${t("product.productClass", "Class")}: ${r.productClass}`
              : null,
            r.uom ? `${t("product.uom", "UOM")}: ${r.uom}` : null,
          ].filter(Boolean);
          return (
            <Tooltip
              title={
                <Box sx={{ whiteSpace: "pre-line" }}>{lines.join("\n")}</Box>
              }
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
  const tableColumns = viewMode === "summary" ? summaryColumns : detailColumns;

  const blockColumnDefs = tableColumns.map((column) => ({
    field: column.field,
    label: column.headerName,
  }));

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

  const handleCellDoubleClick = (params) => {
    if (!params) return;
    pasteToFilter(params.field, params.value ?? params.row?.[params.field]);
  };

  const handleBlockDoubleClick = (e, row) => {
    const text = String(e?.target?.textContent || "").trim();
    if (!text) return;
    if (String(row.productName || "") === text) setProductKeyword(text);
    else if (String(row.stockCode || "") === text) setStockCode(text);
    else if (String(row.stockLocation || "") === text) setLocationKeyword(text);
    else if (String(row.reference || "") === text) setReferenceKeyword(text);
    else if (String(row.actionBy || "") === text) setActionByKeyword(text);
  };

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const openRowMenu = (event, row) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuRow(row);
  };

  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuRow(null);
  };

  const handleMenuPaste = (field) => {
    if (!menuRow) return;
    pasteToFilter(
      field,
      menuRow[field] ||
        menuRow[field === "productName" ? "productName" : field],
    );
    closeRowMenu();
  };

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
        <>
          <LoadMoreBlockList
            items={tableRows}
            renderItem={(row) => (
              <Box
                key={row.id}
                sx={{ position: "relative" }}
                onDoubleClick={(e) => handleBlockDoubleClick(e, row)}
              >
                <IconButton
                  size="small"
                  onClick={(e) => openRowMenu(e, row)}
                  sx={{ position: "absolute", right: 8, top: 8, zIndex: 2 }}
                  aria-label={t(
                    "stockEnquiry.actions.openPasteMenu",
                    "Open paste menu",
                  )}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>

                <BlockListItem
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
              </Box>
            )}
          />

          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={closeRowMenu}
          >
            <MenuItem disabled sx={{ opacity: 1, fontWeight: 600 }}>
              {t("stockEnquiry.actions.pasteMenuTitle", "Paste into filter")}
            </MenuItem>
            <MenuItem onClick={() => handleMenuPaste("productName")}>
              {t("stockEnquiry.filters.product")}
            </MenuItem>
            <MenuItem onClick={() => handleMenuPaste("stockCode")}>
              {t("stockEnquiry.filters.stockCode")}
            </MenuItem>
            <MenuItem onClick={() => handleMenuPaste("stockLocation")}>
              {t("stockEnquiry.filters.location")}
            </MenuItem>
            <MenuItem onClick={() => handleMenuPaste("reference")}>
              {t("stockEnquiry.filters.reference")}
            </MenuItem>
            <MenuItem onClick={() => handleMenuPaste("actionBy")}>
              {t("stockEnquiry.filters.actionBy")}
            </MenuItem>
          </Menu>
        </>
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
            onCellDoubleClick={handleCellDoubleClick}
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
