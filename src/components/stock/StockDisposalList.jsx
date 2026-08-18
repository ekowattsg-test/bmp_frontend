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
  DeleteSweep as DeleteSweepIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { PageHeader } from "../common";
import { request } from "../../helpers/axios_helper";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const fetchStockDisposals = async () => {
  const response = await request("GET", "/api/stockDisposals", null, {
    skipBackendErrorDialog: true,
  });
  return Array.isArray(response?.data) ? response.data : [];
};

const fetchStockDisposalItems = async (disposalId) => {
  const response = await request(
    "GET",
    `/api/stockDisposalItems/disposal/${encodeURIComponent(disposalId)}`,
    null,
    { skipBackendErrorDialog: true },
  );
  return Array.isArray(response?.data) ? response.data : [];
};

export default function StockDisposalList() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedDisposal, setSelectedDisposal] = useState(null);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [productMap, setProductMap] = useState({});

  useEffect(() => {
    setLoading(true);
    setErrorMsg("");
    Promise.all([
      fetchStockDisposals(),
      request("GET", "/api/products", null, { skipBackendErrorDialog: true }),
    ])
      .then(([disposals, productsRes]) => {
        setRows(disposals);
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
      .catch(() => setErrorMsg(t("stockDisposalList.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleView = async (disposal) => {
    setSelectedDisposal(disposal);
    setItems([]);
    setItemsLoading(true);
    try {
      const data = await fetchStockDisposalItems(disposal.disposalId);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDisposal(null);
    setItems([]);
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const values = [
        row.disposalId,
        row.location,
        row.disposedBy,
        row.disposalReason,
        row.disposalMethod,
        row.disposalStatus,
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
      title={t("stockDisposalList.title")}
      subtitle={t("stockDisposalList.subtitle")}
      icon={DeleteSweepIcon}
    />
  );

  const renderSearch = () => (
    <Box sx={{ mb: 3 }}>
      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("stockDisposalList.searchPlaceholder")}
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
      normalized === "DISPOSED"
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
                ? t("stockDisposalList.noSearchResults")
                : t("stockDisposalList.noData")}
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
              <TableCell>{t("stockDisposalList.disposalId")}</TableCell>
              <TableCell>{t("stockDisposalList.location")}</TableCell>
              <TableCell>{t("stockDisposalList.disposedBy")}</TableCell>
              <TableCell>{t("stockDisposalList.reason")}</TableCell>
              <TableCell>{t("stockDisposalList.method")}</TableCell>
              <TableCell>{t("stockDisposalList.disposalDate")}</TableCell>
              <TableCell>{t("stockDisposalList.status")}</TableCell>
              <TableCell align="right">
                {t("stockDisposalList.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.disposalId}
                sx={{ "&:hover": { backgroundColor: "action.hover" } }}
              >
                <TableCell>{row.disposalId}</TableCell>
                <TableCell>{row.location || "-"}</TableCell>
                <TableCell>{row.disposedBy || "-"}</TableCell>
                <TableCell>{row.disposalReason || "-"}</TableCell>
                <TableCell>{row.disposalMethod || "-"}</TableCell>
                <TableCell>
                  {row.disposalDate
                    ? new Date(row.disposalDate).toLocaleString()
                    : "-"}
                </TableCell>
                <TableCell>{renderStatusChip(row.disposalStatus)}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleView(row)}
                  >
                    {t("stockDisposalList.view")}
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
      open={Boolean(selectedDisposal)}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {t("stockDisposalList.detailTitle", {
          disposalId: selectedDisposal?.disposalId,
        })}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t("stockDisposalList.location")}:{" "}
            {selectedDisposal?.location || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("stockDisposalList.disposedBy")}:{" "}
            {selectedDisposal?.disposedBy || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("stockDisposalList.reason")}:{" "}
            {selectedDisposal?.disposalReason || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("stockDisposalList.method")}:{" "}
            {selectedDisposal?.disposalMethod || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("stockDisposalList.status")}:{" "}
            {renderStatusChip(selectedDisposal?.disposalStatus)}
          </Typography>
        </Box>

        {itemsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">
            {t("stockDisposalList.noItems")}
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
                  <TableCell>{t("stockDisposalList.product")}</TableCell>
                  <TableCell>{t("stockDisposalList.stockCode")}</TableCell>
                  <TableCell align="right">
                    {t("stockDisposalList.quantity")}
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
                    <TableRow key={item.stockDisposalItemId || item.id}>
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
                    </TableRow>
                  );
                })}
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                    {t("stockDisposalList.total")}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {totalQuantity}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("stockDisposalList.close")}</Button>
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
