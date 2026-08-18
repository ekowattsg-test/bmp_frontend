import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  TextField,
  Typography,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputAdornment,
} from "@mui/material";
import {
  Search as SearchIcon,
  Reply as ReplyIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { PageHeader } from "../common";
import {
  fetchPurchaseReturns,
  fetchPurchaseReturnItems,
} from "../../helpers/purchase_return_service";
import { request } from "../../helpers/axios_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export default function PurchaseReturnList() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [productMap, setProductMap] = useState({});

  useEffect(() => {
    setLoading(true);
    setErrorMsg("");
    Promise.all([
      fetchPurchaseReturns(),
      request("GET", "/api/products", null, { skipBackendErrorDialog: true }),
    ])
      .then(([returns, productsRes]) => {
        setRows(returns);
        const products = Array.isArray(productsRes?.data)
          ? productsRes.data
          : [];
        const map = {};
        products.forEach((p) => {
          map[String(p.productCode || "")] =
            p.productName || p.commonName || p.productCode || "";
        });
        setProductMap(map);
      })
      .catch(() => setErrorMsg(t("purchaseReturnList.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleView = async (ret) => {
    setSelectedReturn(ret);
    setItems([]);
    setItemsLoading(true);
    try {
      const data = await fetchPurchaseReturnItems(ret.returnId);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReturn(null);
    setItems([]);
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const values = [
        row.returnId,
        row.poId,
        row.vendorId,
        row.vendorName,
        row.location,
        row.returnedBy,
        row.returnStatus,
      ];
      return values.some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [rows, search]);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + toNumber(item.quantity), 0),
    [items],
  );

  const renderHeader = () => (
    <PageHeader
      title={t("purchaseReturnList.title")}
      subtitle={t("purchaseReturnList.subtitle")}
      icon={ReplyIcon}
    />
  );

  const renderSearch = () => (
    <Box sx={{ mb: 3 }}>
      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("purchaseReturnList.searchPlaceholder")}
        size="small"
        sx={{ minWidth: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );

  const renderStatusChip = (status) => {
    const normalized = String(status || "").toUpperCase();
    const color =
      normalized === "CREDITED"
        ? "success"
        : normalized === "CANCELLED"
          ? "error"
          : "primary";
    return <Chip label={status || "-"} size="small" color={color} />;
  };

  const renderTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredRows.length === 0) {
      return (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">
              {search
                ? t("purchaseReturnList.noSearchResults")
                : t("purchaseReturnList.noData")}
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderColor: "var(--color-gray-300)" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "background.default" }}>
              <TableCell>{t("purchaseReturnList.returnId")}</TableCell>
              <TableCell>{t("purchaseReturnList.poId")}</TableCell>
              <TableCell>{t("purchaseReturnList.vendor")}</TableCell>
              <TableCell>{t("purchaseReturnList.location")}</TableCell>
              <TableCell>{t("purchaseReturnList.returnedBy")}</TableCell>
              <TableCell>{t("purchaseReturnList.returnDate")}</TableCell>
              <TableCell>{t("purchaseReturnList.status")}</TableCell>
              <TableCell align="right">
                {t("purchaseReturnList.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.returnId}
                sx={{ "&:hover": { backgroundColor: "action.hover" } }}
              >
                <TableCell>{row.returnId}</TableCell>
                <TableCell>{row.poId || "-"}</TableCell>
                <TableCell>{row.vendorName || row.vendorId || "-"}</TableCell>
                <TableCell>{row.location || "-"}</TableCell>
                <TableCell>{row.returnedBy || "-"}</TableCell>
                <TableCell>
                  {row.returnDate
                    ? new Date(row.returnDate).toLocaleString()
                    : "-"}
                </TableCell>
                <TableCell>{renderStatusChip(row.returnStatus)}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleView(row)}
                  >
                    {t("purchaseReturnList.view")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderDetailDialog = () => (
    <Dialog
      open={Boolean(selectedReturn)}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {t("purchaseReturnList.detailTitle", {
          returnId: selectedReturn?.returnId,
        })}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t("purchaseReturnList.poId")}: {selectedReturn?.poId || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("purchaseReturnList.vendor")}:{" "}
            {selectedReturn?.vendorName || selectedReturn?.vendorId || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("purchaseReturnList.location")}:{" "}
            {selectedReturn?.location || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("purchaseReturnList.status")}:{" "}
            {renderStatusChip(selectedReturn?.returnStatus)}
          </Typography>
        </Box>

        {itemsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">
            {t("purchaseReturnList.noItems")}
          </Typography>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderColor: "var(--color-gray-300)" }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell>{t("purchaseReturnList.product")}</TableCell>
                  <TableCell>{t("purchaseReturnList.stockCode")}</TableCell>
                  <TableCell align="right">
                    {t("purchaseReturnList.quantity")}
                  </TableCell>
                  <TableCell align="right">
                    {t("purchaseReturnList.unitPrice")}
                  </TableCell>
                  <TableCell align="right">
                    {t("purchaseReturnList.lineTotal")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const productName =
                    item.productName ||
                    productMap[item.productCode] ||
                    item.productCode ||
                    "-";
                  return (
                    <TableRow key={item.purchaseReturnItemId || item.id}>
                      <TableCell>
                        {productName}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {item.productCode || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.stockCode || "-"}</TableCell>
                      <TableCell align="right">
                        {toNumber(item.quantity)}
                      </TableCell>
                      <TableCell align="right">
                        {Number(item.unitPrice || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {Number(item.lineTotal || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                    {t("purchaseReturnList.total")}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {totalQuantity}
                  </TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {items
                      .reduce(
                        (sum, item) => sum + Number(item.lineTotal || 0),
                        0,
                      )
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("purchaseReturnList.close")}</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {renderHeader()}
      {errorMsg && (
        <Typography color="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Typography>
      )}
      {renderSearch()}
      {renderTable()}
      {renderDetailDialog()}
    </Box>
  );
}
