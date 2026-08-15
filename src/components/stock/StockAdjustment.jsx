import React, { useContext, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { generateAndStoreAdjustmentPdf } from "../../helpers/adjustment_pdf_helper";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { toLocalISO } from "../../helpers/date_helper";
import { AuthContext } from "../../context/authContext";
import { PageHeader, ProductInfoCard } from "../common";
import HelpDialog from "../common/HelpDialog";
import { getDisplayImageInfo } from "../../helpers/file_helper";
import StockCodeScanInput from "./StockCodeScanInput";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

// `readFirst` removed: use canonical backend field names directly (e.g. `row.stockId`).

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
    productId: String(item.productId || nested.productId || ""),
    productName: String(item.productName || nested.productName || ""),
    productPicture: item.productPicture || nested.productPicture || "",
    uom: String(item.uom || nested.uom || ""),
  };
};

const normalizeStock = (item, fallbackCode) => {
  const product = getProductDetails(item);
  const stockId = String(item.stockId || "");
  const location = String(item.location || "central");

  return {
    key: `${stockId || ""}|${location || "central"}`,
    stockId,
    stockCode: String(item.stockCode || fallbackCode || ""),
    location,
    productId: product.productId,
    productName: product.productName,
    productPicture: product.productPicture,
    uom: product.uom,
    currentQuantity: toNumber(item.currentQuantity || 0),
    availableQuantity: toNumber(item.currentAvailableQuantity || 0),
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

const StockAdjustment = () => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);

  const [helpOpen, setHelpOpen] = useState(false);
  const [stockCode, setStockCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warnMsg, setWarnMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [stocks, setStocks] = useState([]);
  const [selectedStockKey, setSelectedStockKey] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("in");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [adjustmentQty, setAdjustmentQty] = useState(1);

  const adjustmentReasons = useMemo(
    () => [
      { value: "STOCK_COUNT", label: t("stockAdjustment.reasons.stockCount") },
      { value: "DAMAGED", label: t("stockAdjustment.reasons.damaged") },
      { value: "EXPIRED", label: t("stockAdjustment.reasons.expired") },
      { value: "LOST", label: t("stockAdjustment.reasons.lost") },
      { value: "FOUND", label: t("stockAdjustment.reasons.found") },
      { value: "OTHER", label: t("stockAdjustment.reasons.other") },
    ],
    [t],
  );

  const resolvedReasonText = useMemo(() => {
    if (reason === "OTHER") return String(reference || "").trim();
    const matched = adjustmentReasons.find((r) => r.value === reason);
    return matched ? matched.label : String(reference || "").trim();
  }, [reason, reference, adjustmentReasons]);

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
            return toArray(responseByStock?.data).map((row) => ({ row }));
          } catch {
            return [];
          }
        }),
      );

      const viewRows = perStockViewRows.flat().map(({ row }) => {
        const stockId = String(row.stockId);
        const location = String(row.location || "central");
        const movementAtTs =
          safeParseDate(row.recordDate || row.createDate)?.getTime() || 0;

        const quantity = toNumber(row.qty || row.quantity || 0);
        const stockModifier = toNumber(row.stockModifier || 0);
        const holdModifier = toNumber(row.holdModifier || 0);

        const stockMoved = (() => {
          const explicit = row.stockMoved;
          return explicit !== ""
            ? toNumber(explicit)
            : quantity * stockModifier;
        })();
        const holdMoved = (() => {
          const explicit = row.holdMoved;
          return explicit !== "" ? toNumber(explicit) : quantity * holdModifier;
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
        setWarnMsg(t("stockAdjustment.notFound"));
        return;
      }

      setStocks(finalRows);
      setSelectedStockKey(finalRows[0].key);
    } catch (error) {
      setStocks([]);
      setSelectedStockKey("");
      if (error?.response?.status === 404) {
        setWarnMsg(t("stockAdjustment.notFound"));
      } else {
        setErrorMsg(error?.message || t("stockAdjustment.errorLookup"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStock) {
      setWarnMsg(t("stockAdjustment.selectStockLine"));
      return;
    }

    const qty = Number(adjustmentQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setWarnMsg(t("stockAdjustment.quantityRequired"));
      return;
    }

    if (!reason) {
      setWarnMsg(t("stockAdjustment.reasonRequired"));
      return;
    }

    if (reason === "OTHER" && !String(reference || "").trim()) {
      setWarnMsg(t("stockAdjustment.otherReasonRequired"));
      return;
    }

    setSaveBusy(true);
    setErrorMsg("");
    setWarnMsg("");
    setSuccessMsg("");

    try {
      const previousSelectionKey = selectedStock.key;
      const previousQuantity = selectedStock.currentQuantity;
      const reasonText = resolvedReasonText;

      const movementResponse = await request("POST", "/api/stockmovements", {
        stockId: Number(selectedStock.stockId),
        movementType: adjustmentType === "in" ? "M" : "L",
        quantity: qty,
        location: selectedStock.location || "central",
        reference: reasonText,
        actionBy: userInfo?.login || "",
        recordDate: toLocalISO(),
      });

      const movementId = movementResponse?.data?.movementId;

      if (movementId) {
        try {
          await generateAndStoreAdjustmentPdf({
            companyId: String(userInfo?.companyId || "").trim(),
            movementId: String(movementId),
            direction: adjustmentType,
            stockCode: selectedStock.stockCode,
            location: selectedStock.location || "central",
            reason: reasonText,
            quantity: qty,
            productName: selectedStock.productName || "-",
            operator: userInfo?.login || "",
            previousQuantity,
            newQuantity:
              adjustmentType === "in"
                ? previousQuantity + qty
                : previousQuantity - qty,
          });
        } catch (pdfError) {
          // Do not fail the adjustment if PDF storage fails.
          console.warn(
            "[StockAdjustment] PDF generation failed:",
            pdfError?.message || pdfError,
          );
        }
      }

      const refreshedRows = await loadStocksForCode(selectedStock.stockCode);
      setStocks(refreshedRows);
      if (refreshedRows.length > 0) {
        const matched =
          refreshedRows.find((row) => row.key === previousSelectionKey) ||
          refreshedRows[0];
        setSelectedStockKey(matched.key);
      } else {
        setSelectedStockKey("");
      }

      setSuccessMsg(t("stockAdjustment.saveSuccess"));
      setAdjustmentQty(1);
      setReason("");
      setReference("");
    } catch (error) {
      setErrorMsg(error?.message || t("stockAdjustment.saveFailed"));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("stockAdjustment.title")}
        subtitle={t("stockAdjustment.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={CompareArrowsIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockAdjustment.helpTitle")}
        content={t("stockAdjustment.helpBody")}
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
        <Typography sx={{ mb: 1 }}>{t("stockAdjustment.scanHint")}</Typography>
        <StockCodeScanInput
          value={stockCode}
          onChange={setStockCode}
          onSubmit={handleLookup}
          busy={busy}
          submitLabel={t("stockAdjustment.findStock")}
          label={t("stockAdjustment.stockCode")}
          placeholder={t("stockAdjustment.scanPlaceholder")}
          allowProductSearch
        />
      </Paper>

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
      {selectedStock && productInfo && (
        <ProductInfoCard
          productInfo={productInfo}
          productLabel={t("stockAdjustment.product")}
          stockCodeLabel={t("stockAdjustment.stockCode")}
          uomLabel={t("stockAdjustment.uom")}
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
                  <TableCell>{t("stockAdjustment.columns.select")}</TableCell>
                  <TableCell>{t("stockAdjustment.columns.location")}</TableCell>
                  <TableCell>{t("stockAdjustment.columns.current")}</TableCell>
                  <TableCell>
                    {t("stockAdjustment.columns.available")}
                  </TableCell>
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
                            "aria-label": `${t("stockAdjustment.columns.select")} ${row.location || "central"}`,
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
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <ToggleButtonGroup
              exclusive
              value={adjustmentType}
              onChange={(_, value) => {
                if (value) setAdjustmentType(value);
              }}
              size="small"
              aria-label={t("stockAdjustment.adjustmentType")}
            >
              <ToggleButton value="in">
                {t("stockAdjustment.inAdjustment")}
              </ToggleButton>
              <ToggleButton value="out">
                {t("stockAdjustment.outAdjustment")}
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="adjustment-reason-label">
                {t("stockAdjustment.reason")}
              </InputLabel>
              <Select
                labelId="adjustment-reason-label"
                value={reason}
                label={t("stockAdjustment.reason")}
                onChange={(event) => setReason(event.target.value)}
              >
                {adjustmentReasons.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {reason === "OTHER" && (
              <TextField
                size="small"
                label={t("stockAdjustment.reference")}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                sx={{ minWidth: 200 }}
              />
            )}

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 1 }}
                label={t("stockAdjustment.adjustment")}
                value={adjustmentQty}
                onChange={(event) => setAdjustmentQty(event.target.value)}
                sx={{ width: 140 }}
              />

              {productInfo?.uom && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {productInfo.uom}
                </Typography>
              )}
            </Stack>

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saveBusy}
            >
              {t("basic.save")}
            </Button>

            {successMsg && (
              <Typography sx={{ color: "success.main", fontWeight: 600 }}>
                {successMsg}
              </Typography>
            )}
          </Stack>
        </ProductInfoCard>
      )}
    </Box>
  );
};

export default StockAdjustment;
