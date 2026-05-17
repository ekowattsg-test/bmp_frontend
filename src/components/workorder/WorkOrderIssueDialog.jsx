import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { toLocalISO } from "../../helpers/date_helper";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Chip,
  Divider,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import { Close as CloseIcon, Send as SendIcon } from "@mui/icons-material";

/**
 * WorkOrderIssueDialog
 *
 * Props:
 *   workOrder   object  — the work order row from the list
 *   steps       array   — pre-fetched steps for this work order
 *   dataItems   array   — pre-fetched detail items for this work order (may be empty)
 *   staffMap    object  — staffId → staffName
 *   contentType string  — "stock" | "worker"
 *   viewOnly    bool    — hide issue button, show close only
 *   onClose()   callback
 *   onIssued()  callback — called after successfully issuing
 */
const WorkOrderIssueDialog = ({
  workOrder,
  steps,
  dataItems,
  staffMap,
  contentType = "stock",
  viewOnly = false,
  onClose,
  onIssued,
}) => {
  const isWorker = contentType === "worker";
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!isWorker) {
      request("GET", "/api/products")
        .then((res) => setProducts(res.data || []))
        .catch(() => setProducts([]));
    }
  }, [isWorker]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => {
      m[p.productId] = p.productName;
    });
    return m;
  }, [products]);

  const handleIssue = async () => {
    setError("");
    setLoading(true);
    try {
      await request("PUT", `/api/workorders/${workOrder.workOrderId}`, {
        workOrderType: workOrder.workOrderType,
        workDescription: workOrder.workDescription,
        issuedBy: workOrder.issuedBy,
        workOrderDate: workOrder.workOrderDate || toLocalISO(),
        workBy: workOrder.workBy,
        workOrderStatus: "ISSUED",
      });
      onIssued();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("workOrder.issue.failed", "Failed to issue work order."),
      );
      setLoading(false);
    }
  };

  const assignedName = staffMap[workOrder.workBy] || workOrder.workBy || "—";

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          {t("workOrder.issue.title", "Issue Work Order")}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Heading summary */}
        <Box
          sx={{
            backgroundColor: "var(--color-gray-100)",
            p: 2,
            borderRadius: 1,
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("workOrder.workOrderId", "ID")}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body1" fontWeight={600}>
                  {workOrder.workOrderId}
                </Typography>
                <Chip
                  label={workOrder.workOrderStatus || ""}
                  color={
                    workOrder.workOrderStatus === "OPEN"
                      ? "warning"
                      : workOrder.workOrderStatus === "ISSUED" ||
                          workOrder.workOrderStatus === "CLOSED"
                        ? "success"
                        : "default"
                  }
                  size="small"
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("workOrder.workOrderType", "Type")}
              </Typography>
              <Typography variant="body1">{workOrder.workOrderType}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("workOrder.workDescription", "Description")}
              </Typography>
              <Typography variant="body1">
                {workOrder.workDescription || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("workOrder.workBy", "Assigned To")}
              </Typography>
              <Typography variant="body1">{assignedName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("workOrder.issuedBy", "Issued By")}
              </Typography>
              <Typography variant="body1">
                {workOrder.issuedBy || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("workOrder.workOrderDate", "Date")}
              </Typography>
              <Typography variant="body1">
                {workOrder.workOrderDate
                  ? new Date(workOrder.workOrderDate).toLocaleString()
                  : "—"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Steps */}
        {steps.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {t("workOrderSteps.steps", "Steps")}
            </Typography>
            <TableContainer
              sx={{
                border: "1px solid var(--color-gray-200)",
                borderRadius: 1,
                mb: 3,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "background.default" }}>
                    <TableCell sx={{ width: 36, fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("workOrderSteps.description", "Description")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("workOrderSteps.fromLocation", "From")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("workOrderSteps.toLocation", "To")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {t("workOrderSteps.stepStatus", "Status")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {steps.map((s) => {
                    const fromDisplay =
                      s._fromEntity === "worker"
                        ? staffMap[s.fromLocation] || s.fromLocation || "—"
                        : s.fromLocation || "—";
                    const toDisplay =
                      s._toEntity === "worker"
                        ? staffMap[s.toLocation] || s.toLocation || "—"
                        : s.toLocation || "—";
                    return (
                      <TableRow key={s.workStepsId}>
                        <TableCell>{s.stepNumber}</TableCell>
                        <TableCell>{s._description || "—"}</TableCell>
                        <TableCell>{fromDisplay}</TableCell>
                        <TableCell>{toDisplay}</TableCell>
                        <TableCell>{s.stepStatus || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Detail items */}
        {dataItems.length > 0 && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {t("workOrderData.details", "Details")}
            </Typography>
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
                    {!isWorker && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {t("workOrderData.productName", "Product")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {t("workOrderData.quantity", "Quantity")}
                        </TableCell>
                      </>
                    )}
                    {isWorker && (
                      <TableCell sx={{ fontWeight: 600 }}>
                        {t("workOrderData.staffId", "Staff")}
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataItems.map((item, idx) => (
                    <TableRow key={item.workOrderDataId || idx}>
                      {!isWorker && (
                        <>
                          <TableCell>
                            {productMap[item.productId] ||
                              item.productId ||
                              "—"}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                        </>
                      )}
                      {isWorker && (
                        <TableCell>
                          {staffMap[item.staffId] || item.staffId || "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {error && (
          <Typography
            sx={{ mt: 1, color: "var(--color-danger)", fontSize: "0.875rem" }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          {viewOnly ? t("basic.close", "Close") : t("basic.cancel", "Cancel")}
        </Button>
        {!viewOnly && (
          <Button
            variant="contained"
            color="success"
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            onClick={handleIssue}
            disabled={loading}
          >
            {t("workOrder.issue.button", "Issue Work Order")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WorkOrderIssueDialog;
