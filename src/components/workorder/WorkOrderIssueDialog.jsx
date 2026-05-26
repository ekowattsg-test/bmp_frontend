import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { toLocalISO } from "../../helpers/date_helper";
import { ThumbnailImg, ImageCarousel } from "../../helpers/file_helper";
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
import {
  Close as CloseIcon,
  Send as SendIcon,
  Image as ImageIcon,
} from "@mui/icons-material";

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
  typeDescription,
  viewOnly = false,
  onClose,
  onIssued,
}) => {
  const isWorker = contentType === "worker";
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isInProgress = ["INPROGRESS", "CLOSED"].includes(
    workOrder.workOrderStatus,
  );

  // Fetch sub-data to compute scanned quantities when work order is in progress
  const [subDataMap, setSubDataMap] = useState({}); // workOrderDataId → sum of subQuantity
  useEffect(() => {
    if (!isInProgress || dataItems.length === 0) {
      setSubDataMap({});
      return;
    }
    const dataIds = new Set(dataItems.map((d) => d.workOrderDataId));
    request("GET", "/api/workorder-subdata")
      .then((res) => {
        const map = {};
        (res.data || [])
          .filter((s) => dataIds.has(s.workOrderDataId))
          .forEach((s) => {
            map[s.workOrderDataId] =
              (map[s.workOrderDataId] || 0) + Number(s.subQuantity || 1);
          });
        setSubDataMap(map);
      })
      .catch(() => setSubDataMap({}));
  }, [isInProgress, dataItems]);

  // Sorted steps by stepNumber
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0)),
    [steps],
  );

  const [products, setProducts] = useState([]);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStart, setCarouselStart] = useState(0);
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
          {viewOnly
            ? t("workOrder.viewTitle", "View Work Order")
            : t("workOrder.issueTitle", "Issue Work Order")}
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
              <Typography variant="body1">
                {typeDescription || workOrder.workOrderType}
              </Typography>
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
        {sortedSteps.length > 0 && (
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
                  {sortedSteps.map((s) => {
                    const fromDisplay =
                      s._fromEntity === "worker"
                        ? staffMap[s.fromLocation] || s.fromLocation || "—"
                        : s.fromLocation || "—";
                    const toDisplay =
                      s._toEntity === "worker"
                        ? staffMap[s.toLocation] || s.toLocation || "—"
                        : s.toLocation || "—";

                    // Parse photos stored as JSON string on the step record
                    let photos = [];
                    if (s.photos) {
                      try {
                        photos = JSON.parse(s.photos);
                      } catch {
                        photos = [];
                      }
                      if (!Array.isArray(photos)) photos = [];
                    }

                    return (
                      <React.Fragment key={s.workStepsId}>
                        <TableRow>
                          <TableCell>{s.stepNumber}</TableCell>
                          <TableCell>{s._description || "—"}</TableCell>
                          <TableCell>{fromDisplay}</TableCell>
                          <TableCell>{toDisplay}</TableCell>
                          <TableCell>{s.stepStatus || "—"}</TableCell>
                        </TableRow>
                        {photos.length > 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              sx={{ py: 1, bgcolor: "background.default" }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mr: 0.5 }}
                                >
                                  {t("workOrderSteps.photos", "Photos")}:
                                </Typography>
                                {photos.map((p, i) => {
                                  const openCarousel = () => {
                                    setCarouselImages(
                                      photos.map((ph) => ({
                                        displayUrl:
                                          ph.viewUrl || ph.url || null,
                                        viewUrl: ph.viewUrl || null,
                                        title: ph.name || "",
                                        provider: ph.provider || null,
                                        meta: ph,
                                      })),
                                    );
                                    setCarouselStart(i);
                                    setCarouselOpen(true);
                                  };
                                  if (p.id) {
                                    return (
                                      <ThumbnailImg
                                        key={i}
                                        fileId={p.id}
                                        viewUrl={p.viewUrl || p.url || ""}
                                        provider={p.provider || null}
                                        width={64}
                                        height={64}
                                        alt={p.name || `photo-${i + 1}`}
                                        style={{
                                          borderRadius: 4,
                                          cursor: "pointer",
                                          border:
                                            "1px solid var(--color-gray-300)",
                                          flexShrink: 0,
                                        }}
                                        onClick={openCarousel}
                                      />
                                    );
                                  }
                                  if (p.viewUrl || p.url) {
                                    return (
                                      <Box
                                        key={i}
                                        component="img"
                                        src={p.viewUrl || p.url}
                                        alt={p.name || `photo-${i + 1}`}
                                        onClick={openCarousel}
                                        sx={{
                                          width: 64,
                                          height: 64,
                                          objectFit: "cover",
                                          borderRadius: 1,
                                          border: "1px solid",
                                          borderColor: "divider",
                                          display: "block",
                                          cursor: "pointer",
                                          flexShrink: 0,
                                        }}
                                      />
                                    );
                                  }
                                  return (
                                    <Box
                                      key={i}
                                      sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 1,
                                        border: "1px dashed",
                                        borderColor: "divider",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: "background.paper",
                                      }}
                                    >
                                      <ImageIcon
                                        sx={{
                                          color: "text.disabled",
                                          fontSize: 24,
                                        }}
                                      />
                                    </Box>
                                  );
                                })}
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
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
                          <TableCell align="right">
                            {isInProgress ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  justifyContent: "flex-end",
                                }}
                              >
                                <Typography
                                  component="span"
                                  variant="body2"
                                  fontWeight={700}
                                  sx={{
                                    color:
                                      (subDataMap[item.workOrderDataId] || 0) >=
                                      item.quantity
                                        ? "success.main"
                                        : (subDataMap[item.workOrderDataId] ||
                                              0) > 0
                                          ? "warning.main"
                                          : "text.disabled",
                                  }}
                                >
                                  {subDataMap[item.workOrderDataId] || 0}
                                </Typography>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.disabled"
                                >
                                  /
                                </Typography>
                                <Typography component="span" variant="body2">
                                  {item.quantity}
                                </Typography>
                              </Box>
                            ) : (
                              item.quantity
                            )}
                          </TableCell>
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
      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </Dialog>
  );
};

export default WorkOrderIssueDialog;
