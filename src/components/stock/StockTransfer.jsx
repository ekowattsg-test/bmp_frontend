import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Paper,
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
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import { PageHeader, ProductInfoCard } from "../common";
import HelpDialog from "../common/HelpDialog";
import { getDisplayImageInfo } from "../../helpers/file_helper";
import {
  buildLocationSuggestions,
  isLocationCreationDisabled,
  resolveStockLocationLimit,
} from "../../helpers/common_options_helper";
import StockCodeScanInput from "./StockCodeScanInput";

const { maxLocations: STOCKTRANSFER_MAX_LOCATIONS } = resolveStockLocationLimit(
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
        "baselinedQuantity",
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

const StockTransfer = () => {
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
  // Key of the location being transferred OUT of
  const [transferOutKey, setTransferOutKey] = useState("");
  // Key of the location being transferred IN to
  const [transferInKey, setTransferInKey] = useState("");
  const [reference, setReference] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  // Name typed when transferring to a brand-new location
  const [newInLocation, setNewInLocation] = useState("");
  // Known locations from the system (sourced from existing movements)
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

  // True when total system locations already meet the limit — no new location can be created.
  const locationCreationDisabled = isLocationCreationDisabled(
    systemLocations.length,
    STOCKTRANSFER_MAX_LOCATIONS,
  );

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
            baselinedQuantity: toNumber(
              readFirst(row, [
                "baselinedQuantity",
                "baselineQuantity",
                "baseQty",
              ]),
            ),
            stockMoved,
            holdMoved,
          };
        });

      const groupedByLocation = new Map();
      viewRows.forEach((row) => {
        const key = `${row.stockId || ""}|${row.location || "central"}`;
        if (!groupedByLocation.has(key)) {
          groupedByLocation.set(key, {
            key,
            stockId: row.stockId,
            location: row.location,
            baselineQuantity: row.baselinedQuantity,
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
          group.baselineQuantity = row.baselinedQuantity;
        }
      });

      locationRows = Array.from(groupedByLocation.values()).map((group) => {
        const baseStock = baseByStockId.get(group.stockId) || normalized[0];
        const currentQuantity = group.baselineQuantity + group.stockMovedSum;
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

  const transferOutStock = useMemo(
    () => stocks.find((item) => item.key === transferOutKey) || null,
    [transferOutKey, stocks],
  );

  const transferInStock = useMemo(
    () => stocks.find((item) => item.key === transferInKey) || null,
    [transferInKey, stocks],
  );

  const canSave = Boolean(
    transferOutKey && transferInKey && transferOutKey !== transferInKey,
  );

  const handleLookup = async (inputCode) => {
    const codeToUse = String(inputCode || stockCode || "").trim();
    if (!codeToUse) return;

    setBusy(true);
    setStockCode(codeToUse);
    setErrorMsg("");
    setWarnMsg("");
    setSuccessMsg("");
    setTransferOutKey("");
    setTransferInKey("");
    setNewInLocation("");

    try {
      const finalRows = await loadStocksForCode(codeToUse);

      if (finalRows.length === 0) {
        setStocks([]);
        setWarnMsg(t("stockTransfer.notFound"));
        return;
      }

      setStocks(finalRows);
    } catch (error) {
      setStocks([]);
      if (error?.response?.status === 404) {
        setWarnMsg(t("stockTransfer.notFound"));
      } else {
        setErrorMsg(error?.message || t("stockTransfer.errorLookup"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOut = (key) => {
    setTransferOutKey((prev) => (prev === key ? "" : key));
    // If this key was the IN selection, clear it (mutually exclusive)
    if (transferInKey === key) setTransferInKey("");
  };

  const handleToggleIn = (key) => {
    setTransferInKey((prev) => (prev === key ? "" : key));
    // If this key was the OUT selection, clear it (mutually exclusive)
    if (transferOutKey === key) setTransferOutKey("");
  };

  const handleSave = async () => {
    const isNewInLoc = transferInKey === "NEW_LOCATION";
    const isSysInLoc = transferInKey.startsWith("SYSLOC|");

    if (!canSave) {
      setWarnMsg(t("stockTransfer.selectBothLines"));
      return;
    }

    if (isNewInLoc && locationCreationDisabled) {
      setWarnMsg(t("stockTransfer.locationLimitReached"));
      return;
    }

    if (isNewInLoc && !String(newInLocation || "").trim()) {
      setWarnMsg(t("stockTransfer.newLocationRequired"));
      return;
    }

    const ref = String(reference || "").trim();
    if (!ref) {
      setWarnMsg(t("stockTransfer.referenceRequired"));
      return;
    }

    const qty = Number(transferQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setWarnMsg(t("stockTransfer.quantityRequired"));
      return;
    }

    if (transferOutStock && qty > transferOutStock.availableQuantity) {
      setWarnMsg(
        t("stockTransfer.exceedsAvailable", {
          available: transferOutStock.availableQuantity,
        }),
      );
      return;
    }

    setSaveBusy(true);
    setErrorMsg("");
    setWarnMsg("");
    setSuccessMsg("");

    const userSuffix =
      userInfo?.firstName || userInfo?.lastName
        ? `/${[userInfo.firstName, userInfo.lastName].filter(Boolean).join(" ")}`
        : "";
    const fullRef = ref + userSuffix;

    try {
      // Resolve the IN stock target — may need to create a new stock record
      let targetInStockId;
      let targetInLocation;

      if (isNewInLoc || isSysInLoc) {
        const trimmedLocation = isNewInLoc
          ? String(newInLocation || "").trim()
          : transferInKey.slice("SYSLOC|".length);
        const productId = stocks[0]?.productId;
        const codeToUse = stocks[0]?.stockCode || stockCode;
        try {
          const newStockRes = await request("POST", "/api/stocks", {
            productId: Number(productId),
            stockCode: codeToUse,
            location: trimmedLocation,
            createDate: new Date().toISOString(),
          });
          targetInStockId = Number(
            readFirst(newStockRes?.data || {}, ["stockId", "id"]),
          );
        } catch (stockErr) {
          throw new Error(
            stockErr?.message || t("stockTransfer.createStockFailed"),
          );
        }
        targetInLocation = trimmedLocation;
      } else {
        targetInStockId = Number(transferInStock.stockId);
        targetInLocation = transferInStock.location || "central";
      }

      // Transfer Out (G)
      await request("POST", "/api/stockmovements", {
        stockId: Number(transferOutStock.stockId),
        movementType: "G",
        quantity: qty,
        location: transferOutStock.location || "central",
        reference: fullRef,
        recordDate: new Date().toISOString(),
      });

      // Transfer In (C)
      await request("POST", "/api/stockmovements", {
        stockId: targetInStockId,
        movementType: "C",
        quantity: qty,
        location: targetInLocation,
        reference: fullRef,
        recordDate: new Date().toISOString(),
      });

      const refreshedRows = await loadStocksForCode(
        transferOutStock.stockCode || stockCode,
      );
      setStocks(refreshedRows);
      // Re-validate selections still exist after refresh
      const keys = new Set(refreshedRows.map((r) => r.key));
      if (!keys.has(transferOutKey)) setTransferOutKey("");
      if (!keys.has(transferInKey)) setTransferInKey("");
      setNewInLocation("");

      setSuccessMsg(t("stockTransfer.saveSuccess"));
      setTransferQty(1);
      setReference("");
    } catch (error) {
      setErrorMsg(error?.message || t("stockTransfer.saveFailed"));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("stockTransfer.title")}
        subtitle={t("stockTransfer.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={SwapHorizIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockTransfer.helpTitle")}
        content={t("stockTransfer.helpBody")}
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
        <Typography sx={{ mb: 1 }}>{t("stockTransfer.scanHint")}</Typography>
        <StockCodeScanInput
          value={stockCode}
          onChange={setStockCode}
          onSubmit={handleLookup}
          busy={busy}
          submitLabel={t("stockTransfer.findStock")}
          label={t("stockTransfer.stockCode")}
          placeholder={t("stockTransfer.scanPlaceholder")}
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

      {stocks.length > 0 && productInfo && (
        <ProductInfoCard
          productInfo={productInfo}
          productLabel={t("stockTransfer.product")}
          stockCodeLabel={t("stockTransfer.stockCode")}
          uomLabel={t("stockTransfer.uom")}
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
                  <TableCell>{t("stockTransfer.columns.out")}</TableCell>
                  <TableCell>{t("stockTransfer.columns.in")}</TableCell>
                  <TableCell>{t("stockTransfer.columns.location")}</TableCell>
                  <TableCell>{t("stockTransfer.columns.current")}</TableCell>
                  <TableCell>{t("stockTransfer.columns.available")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stocks.map((row) => {
                  const isOut = row.key === transferOutKey;
                  const isIn = row.key === transferInKey;
                  return (
                    <TableRow
                      key={row.key}
                      hover
                      selected={isOut || isIn}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isOut}
                          disabled={transferInKey === row.key}
                          inputProps={{
                            "aria-label": `${t("stockTransfer.columns.out")} ${row.location || "central"}`,
                          }}
                          onChange={() => handleToggleOut(row.key)}
                        />
                      </TableCell>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isIn}
                          disabled={transferOutKey === row.key}
                          inputProps={{
                            "aria-label": `${t("stockTransfer.columns.in")} ${row.location || "central"}`,
                          }}
                          onChange={() => handleToggleIn(row.key)}
                        />
                      </TableCell>
                      <TableCell>{row.location || "central"}</TableCell>
                      <TableCell>{row.currentQuantity}</TableCell>
                      <TableCell>{row.availableQuantity}</TableCell>
                    </TableRow>
                  );
                })}

                {/* System locations not yet assigned to this stock — selectable as IN target only */}
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
                    const isIn = transferInKey === sysKey;
                    return (
                      <TableRow
                        key={sysKey}
                        hover
                        selected={isIn}
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleToggleIn(sysKey)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox disabled checked={false} />
                        </TableCell>
                        <TableCell
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isIn}
                            inputProps={{
                              "aria-label": `${t("stockTransfer.columns.in")} ${loc.value}`,
                            }}
                            onChange={() => handleToggleIn(sysKey)}
                          />
                        </TableCell>
                        <TableCell>{loc.value}</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>0</TableCell>
                      </TableRow>
                    );
                  })}

                {/* New location row — IN target only; hidden when at location limit */}
                {!locationCreationDisabled &&
                  (() => {
                    const isNewLocIn = transferInKey === "NEW_LOCATION";
                    return (
                      <TableRow
                        key="NEW_LOCATION"
                        hover
                        selected={isNewLocIn}
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleToggleIn("NEW_LOCATION")}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox disabled checked={false} />
                        </TableCell>
                        <TableCell
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isNewLocIn}
                            inputProps={{
                              "aria-label": t("stockTransfer.newLocation"),
                            }}
                            onChange={() => handleToggleIn("NEW_LOCATION")}
                          />
                        </TableCell>
                        <TableCell
                          sx={{ color: "primary.main", fontStyle: "italic" }}
                        >
                          + {t("stockTransfer.newLocation")}
                        </TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>0</TableCell>
                      </TableRow>
                    );
                  })()}
              </TableBody>
            </Table>
          </TableContainer>

          {(transferOutStock || transferOutKey) &&
            (transferInStock ||
              transferInKey === "NEW_LOCATION" ||
              transferInKey.startsWith("SYSLOC|")) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("stockTransfer.transferSummary", {
                  from: transferOutStock?.location || "central",
                  to:
                    transferInKey === "NEW_LOCATION"
                      ? newInLocation || t("stockTransfer.newLocation")
                      : transferInKey.startsWith("SYSLOC|")
                        ? transferInKey.slice("SYSLOC|".length)
                        : transferInStock?.location || "central",
                })}
              </Alert>
            )}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            {transferInKey === "NEW_LOCATION" && (
              <TextField
                size="small"
                label={t("stockTransfer.newLocationLabel")}
                placeholder={t("stockTransfer.newLocationPlaceholder")}
                value={newInLocation}
                onChange={(event) => setNewInLocation(event.target.value)}
                sx={{ minWidth: 220 }}
                required
                autoFocus
              />
            )}

            <TextField
              size="small"
              label={t("stockTransfer.reference")}
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
                label={t("stockTransfer.quantity")}
                value={transferQty}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "") {
                    setTransferQty("");
                    return;
                  }
                  const numericValue = Number(nextValue);
                  if (Number.isFinite(numericValue) && numericValue > 0) {
                    setTransferQty(nextValue);
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

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saveBusy || !canSave}
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

export default StockTransfer;
