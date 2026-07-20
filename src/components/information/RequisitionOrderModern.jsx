import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SaveIcon from "@mui/icons-material/Save";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { LoadingState, PageHeader } from "../common";
import ProductDialog from "../stock/ProductDialog";

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const statusColor = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "success";
    case "created":
      return "primary";
    case "selected":
      return "info";
    case "requisited":
      return "warning";
    default:
      return "default";
  }
};

const RequisitionOrderModern = () => {
  const { t } = useTranslation();

  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState({});
  const [stockByProduct, setStockByProduct] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [poResult, setPoResult] = useState(null);
  const [productDialogOrderId, setProductDialogOrderId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // decisions: { [requisitionOrderId]: { vendorPurchased, productRequisited, quantityPurchased, unitPrice, purchaseDate } }
  const [decisions, setDecisions] = useState({});

  // Load all data
  useEffect(() => {
    setLoading(true);
    setErrorMsg("");
    Promise.all([
      request("GET", "/api/requisitionorders"),
      request("GET", "/api/vendors"),
      request("GET", "/api/products"),
    ])
      .then(([ordersRes, vendorsRes, productsRes]) => {
        const nextOrders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
        const nextVendors = Array.isArray(vendorsRes?.data)
          ? vendorsRes.data
          : [];
        const nextProductsList = Array.isArray(productsRes?.data)
          ? productsRes.data
          : [];

        const productMap = {};
        nextProductsList.forEach((p) => {
          if (p?.productId) productMap[String(p.productId)] = p;
        });

        setOrders(nextOrders);
        setVendors(nextVendors);
        setProducts(productMap);

        // Seed decisions from existing data on each order
        const initialDecisions = {};
        nextOrders.forEach((o) => {
          initialDecisions[o.requisitionOrderId] = {
            vendorPurchased: o.vendorPurchased ?? o.vendorSuggested ?? "",
            productRequisited: o.productRequisited ?? o.productRequested ?? "",
            quantityPurchased: o.quantityPurchased ?? o.quantityRequested ?? "",
            unitPrice: o.unitPrice ?? o.priceSuggested ?? "",
            selected: Number(o.selected) === 1,
          };
        });
        setDecisions(initialDecisions);

        // Fetch stock availability for each unique productRequested
        const uniqueProductIds = [
          ...new Set(
            nextOrders
              .map((o) => String(o.productRequested || "").trim())
              .filter(Boolean),
          ),
        ];
        Promise.all(
          uniqueProductIds.map((pid) =>
            request("GET", `/api/stockviews/product/${encodeURIComponent(pid)}`)
              .then((res) => {
                const data = Array.isArray(res?.data) ? res.data : [];
                const available = data.reduce(
                  (sum, row) =>
                    sum + (safeNum(row.currentAvailableQuantity) ?? 0),
                  0,
                );
                return { pid, available };
              })
              .catch(() => ({ pid, available: null })),
          ),
        ).then((results) => {
          const nextStock = {};
          results.forEach(({ pid, available }) => {
            nextStock[pid] = available;
          });
          setStockByProduct(nextStock);
        });
      })
      .catch(() => {
        setErrorMsg(
          t(
            "requisitionOrder.loadFailed",
            "Failed to load requisition orders.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [t]);

  // Group orders by projectCode
  const ordersByProject = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const key = String(
        order.projectCode || t("requisitionOrder.noProject", "No Project"),
      );
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(order);
    });
    return map;
  }, [orders, t]);

  const handleDecisionChange = useCallback((orderId, field, value) => {
    setDecisions((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value,
      },
    }));
  }, []);

  const selectedCount = Object.values(decisions).filter(
    (d) => d?.selected,
  ).length;

  const handleGeneratePo = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    setPoResult(null);
    try {
      const payload = orders.map((order) => {
        const d = decisions[order.requisitionOrderId] || {};
        return {
          ...order,
          vendorPurchased: d.vendorPurchased || null,
          productRequisited: d.productRequisited || null,
          quantityPurchased:
            d.quantityPurchased !== "" ? Number(d.quantityPurchased) : null,
          unitPrice: d.unitPrice !== "" ? Number(d.unitPrice) : null,
          selected: d.selected ? 1 : 0,
          status: d.selected ? "selected" : "requisited",
        };
      });
      const response = await request(
        "POST",
        "/api/requisitionorders/create-po",
        payload,
      );
      setPoResult(response?.data || null);
      setSuccessMsg(
        t(
          "requisitionOrder.poSuccess",
          "Purchase order generated successfully.",
        ),
      );
      const res = await request("GET", "/api/requisitionorders");
      setOrders(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("requisitionOrder.poFailed", "Failed to generate purchase order."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProject = async (projectCode) => {
    const projectOrders = ordersByProject.get(projectCode) || [];
    if (saving) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await Promise.all(
        projectOrders.map((order) => {
          const d = decisions[order.requisitionOrderId] || {};
          const payload = {
            ...order,
            vendorPurchased: d.vendorPurchased || null,
            productRequisited: d.productRequisited || null,
            quantityPurchased:
              d.quantityPurchased !== "" ? Number(d.quantityPurchased) : null,
            unitPrice: d.unitPrice !== "" ? Number(d.unitPrice) : null,
            selected: d.selected ? 1 : 0,
            status: d.selected ? "selected" : "requisited",
          };
          return request(
            "PUT",
            `/api/requisitionorders/${order.requisitionOrderId}`,
            payload,
          );
        }),
      );
      const res = await request("GET", "/api/requisitionorders");
      setOrders(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      setErrorMsg(
        String(error?.response?.data?.message || "").trim() ||
          t("requisitionOrder.saveFailed", "Failed to save decisions."),
      );
    } finally {
      setSaving(false);
    }
  };

  const productName = (productId) => {
    const p = products[String(productId || "")];
    return p?.productName || p?.commonName || String(productId || "-");
  };

  const vendorName = (vendorId) => {
    const v = vendors.find((vnd) => String(vnd.vendorId) === String(vendorId));
    return v?.vendorName || String(vendorId || "");
  };

  const stockDisplay = (productId) => {
    const pid = String(productId || "");
    const val = stockByProduct[pid];
    if (val === null || val === undefined) return "-";
    return val;
  };

  if (loading) {
    return (
      <LoadingState
        message={t("requisitionOrder.loading", "Loading requisition orders...")}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={t("requisitionOrder.title", "Requisition Order")}
        subtitle={t(
          "requisitionOrder.subtitle",
          "Review generated requisitions by project and record purchase decisions.",
        )}
      />

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      ) : null}

      {ordersByProject.size === 0 ? (
        <Alert severity="info">
          {t("requisitionOrder.noOrders", "No requisition orders found.")}
        </Alert>
      ) : (
        <>
          {Array.from(ordersByProject.entries()).map(
            ([projectCode, projectOrders]) => (
              <Accordion key={projectCode} defaultExpanded sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700}>
                      {projectCode}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("requisitionOrder.lineCount", "{{count}} line(s)", {
                        count: projectOrders.length,
                      })}
                    </Typography>
                    <Box
                      sx={{
                        ml: "auto",
                        display: "flex",
                        gap: 1,
                        pr: 1,
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {t("requisitionOrder.selectedLabel", "Selected")}
                      </Typography>
                      <Checkbox
                        size="small"
                        checked={projectOrders.every(
                          (o) =>
                            decisions[o.requisitionOrderId]?.selected === true,
                        )}
                        indeterminate={
                          !projectOrders.every(
                            (o) =>
                              decisions[o.requisitionOrderId]?.selected ===
                              true,
                          ) &&
                          projectOrders.some(
                            (o) =>
                              decisions[o.requisitionOrderId]?.selected ===
                              true,
                          )
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDecisions((prev) => {
                            const next = { ...prev };
                            projectOrders.forEach((o) => {
                              next[o.requisitionOrderId] = {
                                ...next[o.requisitionOrderId],
                                selected: checked,
                              };
                            });
                            return next;
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ p: 0 }}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                          <TableCell>
                            {t(
                              "requisitionOrder.cols.product",
                              "Product Requested",
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {t(
                              "requisitionOrder.cols.qtyRequested",
                              "Qty Req.",
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {t(
                              "requisitionOrder.cols.stockAvail",
                              "Stock Avail.",
                            )}
                          </TableCell>
                          <TableCell>
                            {t(
                              "requisitionOrder.cols.actualProduct",
                              "Actual Product",
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {t(
                              "requisitionOrder.cols.qtyPurchase",
                              "Qty Purchase",
                            )}
                          </TableCell>
                          <TableCell>
                            {t("requisitionOrder.cols.vendor", "Vendor")}
                          </TableCell>
                          <TableCell align="right">
                            {t("requisitionOrder.cols.unitPrice", "Unit Price")}
                          </TableCell>
                          <TableCell>
                            {t(
                              "requisitionOrder.cols.requisitionDate",
                              "Req. Date",
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {t("requisitionOrder.cols.selected", "Selected")}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {projectOrders.map((order) => {
                          const d = decisions[order.requisitionOrderId] || {};
                          const stock = stockDisplay(order.productRequested);
                          const stockNum = safeNum(stock);
                          const qtyReq = safeNum(order.quantityRequested);
                          const stockLow =
                            stockNum !== null &&
                            qtyReq !== null &&
                            stockNum < qtyReq;

                          return (
                            <TableRow key={order.requisitionOrderId} hover>
                              <TableCell>
                                <Tooltip
                                  title={`ID: ${order.productRequested}`}
                                  arrow
                                >
                                  <Typography variant="body2">
                                    {productName(order.productRequested)}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {order.quantityRequested ?? "-"}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: stockLow
                                      ? "error.main"
                                      : "success.main",
                                    fontWeight: 600,
                                  }}
                                >
                                  {stock}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box
                                  onClick={() =>
                                    setProductDialogOrderId(
                                      order.requisitionOrderId,
                                    )
                                  }
                                  sx={{
                                    cursor: "pointer",
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    minWidth: 120,
                                    bgcolor: "background.default",
                                    "&:hover": { borderColor: "primary.main" },
                                  }}
                                >
                                  <Typography variant="body2" noWrap>
                                    {productName(d.productRequisited) || (
                                      <em
                                        style={{
                                          color: "var(--color-text-secondary)",
                                        }}
                                      >
                                        {t(
                                          "requisitionOrder.cols.actualProductPlaceholder",
                                          "Click to select",
                                        )}
                                      </em>
                                    )}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={d.quantityPurchased ?? ""}
                                  onChange={(e) =>
                                    handleDecisionChange(
                                      order.requisitionOrderId,
                                      "quantityPurchased",
                                      e.target.value,
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    style: { textAlign: "right" },
                                  }}
                                  sx={{ width: 90 }}
                                />
                              </TableCell>
                              <TableCell>
                                <FormControl
                                  size="small"
                                  sx={{ minWidth: 150 }}
                                >
                                  <Select
                                    value={String(d.vendorPurchased ?? "")}
                                    onChange={(e) =>
                                      handleDecisionChange(
                                        order.requisitionOrderId,
                                        "vendorPurchased",
                                        e.target.value,
                                      )
                                    }
                                    displayEmpty
                                  >
                                    <MenuItem value="">
                                      <em>
                                        {t(
                                          "requisitionOrder.selectVendor",
                                          "Select vendor",
                                        )}
                                      </em>
                                    </MenuItem>
                                    {vendors.map((v) => (
                                      <MenuItem
                                        key={v.vendorId}
                                        value={String(v.vendorId)}
                                      >
                                        {v.vendorName}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={d.unitPrice ?? ""}
                                  onChange={(e) =>
                                    handleDecisionChange(
                                      order.requisitionOrderId,
                                      "unitPrice",
                                      e.target.value,
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    step: "0.01",
                                    style: { textAlign: "right" },
                                  }}
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {order.requisitionDate ?? "-"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Checkbox
                                  size="small"
                                  checked={
                                    decisions[order.requisitionOrderId]
                                      ?.selected === true
                                  }
                                  onChange={(e) =>
                                    handleDecisionChange(
                                      order.requisitionOrderId,
                                      "selected",
                                      e.target.checked,
                                    )
                                  }
                                  sx={{ p: 0 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box
                    sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}
                  ></Box>
                </AccordionDetails>
              </Accordion>
            ),
          )}

          {selectedCount > 0 ? (
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={
                  saving ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <ReceiptLongIcon />
                  )
                }
                onClick={handleGeneratePo}
                disabled={saving}
              >
                {saving
                  ? t("requisitionOrder.poGenerating", "Generating PO...")
                  : t(
                      "requisitionOrder.generatePo",
                      "Generate PO ({{count}} selected)",
                      { count: selectedCount },
                    )}
              </Button>
            </Box>
          ) : null}

          {poResult !== null ? (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 1,
                border: "1px solid",
                borderColor: "success.light",
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                {t("requisitionOrder.poResultTitle", "PO Generation Result")}
              </Typography>

              {Array.isArray(poResult) ? (
                poResult.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      "requisitionOrder.poResultEmpty",
                      "No orders were generated.",
                    )}
                  </Typography>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Box
                      component="table"
                      sx={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.82rem",
                      }}
                    >
                      <thead>
                        <tr>
                          {Object.keys(poResult[0]).map((col) => (
                            <Box
                              key={col}
                              component="th"
                              sx={{
                                textAlign: "left",
                                py: 0.75,
                                px: 1,
                                bgcolor: "grey.50",
                                borderBottom: "2px solid",
                                borderColor: "divider",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {col}
                            </Box>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {poResult.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {Object.values(row).map((val, colIdx) => (
                              <Box
                                key={colIdx}
                                component="td"
                                sx={{
                                  py: 0.75,
                                  px: 1,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {String(val ?? "-")}
                              </Box>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                )
              ) : typeof poResult === "object" ? (
                Object.entries(poResult).map(([key, val]) => (
                  <Box key={key} sx={{ display: "flex", gap: 2, mb: 0.5 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: 180, flexShrink: 0 }}
                    >
                      {key}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {String(val ?? "-")}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2">{String(poResult)}</Typography>
              )}
            </Box>
          ) : null}
        </>
      )}

      <ProductDialog
        open={productDialogOrderId !== null}
        onClose={() => setProductDialogOrderId(null)}
        stockCode=""
        onSelected={({ product }) => {
          if (product?.productId && productDialogOrderId !== null) {
            handleDecisionChange(
              productDialogOrderId,
              "productRequisited",
              product.productId,
            );
            setProducts((prev) => ({
              ...prev,
              [String(product.productId)]: product,
            }));
          }
          setProductDialogOrderId(null);
        }}
      />
    </Box>
  );
};

export default RequisitionOrderModern;
