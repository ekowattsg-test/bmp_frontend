import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Card,
  CardContent,
  Radio,
  FormControlLabel,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  ReceiptLong as ReceiptIcon,
  OpenInNew as OpenInNewIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import { PageHeader, LocationScanner } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useReceivePoStock from "../../hooks/useReceivePoStock";
import { ThumbnailImg, ImageCarousel } from "../../helpers/file_helper";

export default function ReceivePoStock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useReceivePoStock();
  const [scanInput, setScanInput] = React.useState("");

  const {
    isPda,
    helpOpen,
    setHelpOpen,
    eligiblePos,
    posLoading,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    order,
    orderLoading,
    scannedLocation,
    setScannedLocation,
    handleClearLocation,
    orderItems,
    lineTotals,
    quantityWarnings,
    scannedItems,
    pendingScan,
    setPendingScan,
    handleScanSubmit,
    addIdentifiedScan,
    handleUpdateScan,
    handleRemoveScan,
    amendDialogOpen,
    setAmendDialogOpen,
    amendItems,
    amending,
    handleOpenAmendDialog,
    handleAmendItemChange,
    handleAmendPo,
    busy,
    errorMsg,
    successMsg,
    completedResult,
    canExecute,
    handleExecute,
    handleReset,
    receiptPhotos,
    photoUploading,
    handleAddReceiptPhoto,
    handleRemoveReceiptPhoto,
  } = hook;

  const handleIdentifySubmit = () => {
    if (!pendingScan?.productCode || !pendingScan?.stockId) return;
    addIdentifiedScan({
      stockId: pendingScan.stockId,
      productCode: pendingScan.productCode,
      subQuantity: pendingScan.subQuantity,
    });
  };

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("receivePoStock.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("receivePoStock.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("receivePoStock.title")}
        subtitle={t("receivePoStock.subtitle")}
        icon={ReceiptIcon}
        onHelpClick={() => setHelpOpen(true)}
      />
    );
  };

  const renderAlerts = () => (
    <>
      {completedResult && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2">
              {t("receivePoStock.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("receivePoStock.pdfStored", {
                  fileName: completedResult.pdfResult.fileName,
                })}
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                onClick={() =>
                  navigate(isPda ? "/pda/stockcard" : "/workorder")
                }
              >
                {t("receivePoStock.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("receivePoStock.receiveAnother")}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
    </>
  );

  const renderSelectors = () => (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
        mb: 3,
      }}
    >
      <Autocomplete
        options={eligiblePos}
        getOptionLabel={(option) =>
          option?.orderId
            ? `${option.orderId}${option.vendorName ? ` — ${option.vendorName}` : ""}`
            : ""
        }
        value={selectedOrder}
        onChange={(_, newValue) => {
          setSelectedOrderId(newValue?.orderId || "");
        }}
        loading={posLoading}
        disabled={busy || Boolean(completedResult)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("receivePoStock.selectPo")}
            placeholder={t("receivePoStock.selectPoPlaceholder")}
            size="small"
          />
        )}
      />

      <LocationScanner
        value={scannedLocation}
        onChange={setScannedLocation}
        gpsEnabled
        autoDetectGpsOnMount
        disabled={busy || Boolean(completedResult)}
        labels={{
          detectByGps: t("receivePoStock.detectByGps"),
          detectingLocation: t("receivePoStock.detectingLocation"),
          gpsLocationFailed: t("receivePoStock.gpsLocationFailed"),
          changeLocation: t("receivePoStock.changeLocation"),
          scanLabel: t("receivePoStock.scanLocationLabel"),
          scanPlaceholder: t("receivePoStock.scanLocationPlaceholder"),
        }}
      />
    </Box>
  );

  const renderScanArea = () => {
    if (!order || orderLoading || completedResult) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("receivePoStock.scanTitle", "Scan Stock Code")}
        </Typography>
        <StockCodeScanInput
          value={scanInput}
          onChange={setScanInput}
          onSubmit={(value) => {
            setScanInput("");
            handleScanSubmit(value);
          }}
          placeholder={t(
            "receivePoStock.scanPlaceholder",
            "Scan or type stock code...",
          )}
          showSubmitButton={false}
          busy={busy}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block" }}
        >
          {t(
            "receivePoStock.scanHint",
            "Scan a code, then identify the PO line if needed.",
          )}
        </Typography>
      </Box>
    );
  };

  const renderScannedItemsTable = () => {
    if (scannedItems.length === 0) return null;

    return (
      <TableContainer component={Paper} sx={{ mb: 3, boxShadow: 1 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "background.default" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                {t("receivePoStock.stockCode")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {t("receivePoStock.product")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                {t("receivePoStock.qty")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">
                {t("basic.actions", "Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scannedItems.map((scan, index) => (
              <TableRow key={`${scan.stockId}-${index}`} hover>
                <TableCell>{scan.stockId}</TableCell>
                <TableCell>
                  {orderItems.find(
                    (item) => item.productCode === scan.productCode,
                  )?.productName || scan.productCode}
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 1, step: 1 }}
                    value={scan.subQuantity}
                    onChange={(e) =>
                      handleUpdateScan(index, "subQuantity", e.target.value)
                    }
                    disabled={busy}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveScan(index)}
                    disabled={busy}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderScannedItemsCards = () => {
    if (scannedItems.length === 0) return null;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
        {scannedItems.map((scan, index) => {
          const product = orderItems.find(
            (item) => item.productCode === scan.productCode,
          );
          return (
            <Card key={`${scan.stockId}-${index}`} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {scan.stockId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {product?.productName || scan.productCode}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 1, step: 1 }}
                      value={scan.subQuantity}
                      onChange={(e) =>
                        handleUpdateScan(index, "subQuantity", e.target.value)
                      }
                      disabled={busy}
                      sx={{ width: 70 }}
                      label={t("receivePoStock.qty")}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveScan(index)}
                      disabled={busy}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const renderLineProgress = () => {
    if (orderItems.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("receivePoStock.lineProgress", "PO Line Progress")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: "background.default" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t("receivePoStock.product")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t("receivePoStock.orderedQty")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t("receivePoStock.receivedQty")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  {t("receivePoStock.status")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderItems.map((item) => {
                const total = lineTotals[item.productCode];
                const isComplete = total.received === total.ordered;
                const isOver = total.received > total.ordered;
                return (
                  <TableRow key={item.productCode} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {item.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.productCode}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{total.ordered}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          color: isOver
                            ? "error.main"
                            : isComplete
                              ? "success.main"
                              : "text.primary",
                          fontWeight: isOver || isComplete ? 600 : 400,
                        }}
                      >
                        {total.received}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isComplete ? (
                        <Chip
                          size="small"
                          color="success"
                          label={t("receivePoStock.complete", "OK")}
                        />
                      ) : (
                        <Chip
                          size="small"
                          color={isOver ? "error" : "default"}
                          label={
                            isOver
                              ? t("receivePoStock.over", "Over")
                              : t("receivePoStock.pending", "Pending")
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const [carouselOpen, setCarouselOpen] = React.useState(false);
  const [carouselStart, setCarouselStart] = React.useState(0);

  const carouselImages = receiptPhotos.map((ph) => ({
    displayUrl: ph.metadata?.viewUrl || ph.localUrl || null,
    viewUrl: ph.metadata?.viewUrl || null,
    title: ph.metadata?.name || "",
    provider: ph.metadata?.provider || null,
    meta: ph.metadata || null,
  }));

  const renderPhotoPanel = () => {
    if (!order || orderLoading || completedResult) return null;

    return (
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("receivePoStock.photos", "Receipt Photos")}{" "}
          <Typography component="span" variant="caption" color="text.secondary">
            ({receiptPhotos.length})
          </Typography>
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
          }}
        >
          {receiptPhotos.map((p, i) => (
            <Box key={i} sx={{ position: "relative", width: 72, height: 72 }}>
              {p.metadata?.id ? (
                <ThumbnailImg
                  fileId={p.metadata.id}
                  viewUrl={p.metadata.viewUrl || p.metadata.url || p.localUrl}
                  provider={p.metadata.provider || null}
                  width={72}
                  height={72}
                  alt={p.metadata.name || `photo-${i + 1}`}
                  style={{
                    borderRadius: 4,
                    objectFit: "cover",
                    border: "1px solid var(--color-gray-300)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setCarouselStart(i);
                    setCarouselOpen(true);
                  }}
                />
              ) : (
                <Box
                  component="img"
                  src={p.localUrl}
                  onClick={() => {
                    setCarouselStart(i);
                    setCarouselOpen(true);
                  }}
                  sx={{
                    width: 72,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                  }}
                />
              )}
              <IconButton
                size="small"
                onClick={() => handleRemoveReceiptPhoto(i)}
                disabled={busy}
                sx={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  bgcolor: "background.paper",
                  p: 0.25,
                }}
              >
                <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
              </IconButton>
            </Box>
          ))}
          <Box
            component="label"
            sx={{
              width: 72,
              height: 72,
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: photoUploading || busy ? "default" : "pointer",
              color: "text.disabled",
            }}
          >
            {photoUploading ? (
              <CircularProgress size={20} />
            ) : (
              <CameraAltIcon />
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={photoUploading || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAddReceiptPhoto(file);
                e.target.value = "";
              }}
            />
          </Box>
        </Box>
        {receiptPhotos.length === 0 && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ mt: 0.5, display: "block" }}
          >
            {t(
              "receivePoStock.photoRequired",
              "At least one photo is required.",
            )}
          </Typography>
        )}
      </Box>
    );
  };

  const renderWarnings = () => {
    if (quantityWarnings.length === 0) return null;

    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          {t("receivePoStock.quantityMismatchTitle")}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {quantityWarnings.map((warning) => (
            <Typography
              component="li"
              variant="body2"
              key={warning.productCode}
            >
              {t("receivePoStock.quantityMismatch", {
                productName: warning.productName,
                received: warning.received,
                ordered: warning.ordered,
              })}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleOpenAmendDialog}
            disabled={busy || Boolean(completedResult)}
          >
            {t("receivePoStock.amendPo")}
          </Button>
        </Box>
      </Alert>
    );
  };

  const renderActions = () => {
    if (!order) return null;

    return (
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          onClick={handleExecute}
          disabled={!canExecute || busy || Boolean(completedResult)}
          startIcon={
            busy ? <CircularProgress size={16} color="inherit" /> : null
          }
          fullWidth={isPda}
          size={isPda ? "large" : "medium"}
        >
          {busy ? t("receivePoStock.executing") : t("receivePoStock.execute")}
        </Button>
        {!isPda && (
          <Button variant="outlined" onClick={handleReset} disabled={busy}>
            {t("receivePoStock.reset")}
          </Button>
        )}
      </Box>
    );
  };

  const renderIdentifyDialog = () => {
    if (!pendingScan) return null;

    return (
      <Dialog open onClose={() => setPendingScan(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t("receivePoStock.identifyTitle", "Identify Scanned Item")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("receivePoStock.identifyBody", {
              stockCode: pendingScan.stockId,
            })}
          </Typography>

          <TextField
            fullWidth
            size="small"
            label={t("receivePoStock.stockCode")}
            value={pendingScan.stockId}
            disabled
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: 1, step: 1 }}
            label={t("receivePoStock.qty")}
            value={pendingScan.subQuantity}
            onChange={(e) =>
              setPendingScan((prev) => ({
                ...prev,
                subQuantity: e.target.value,
              }))
            }
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {t("receivePoStock.selectPoLine", "Select PO Line")}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {orderItems.map((item) => {
              const total = lineTotals[item.productCode];
              const isFull = total.received >= total.ordered;
              return (
                <Card
                  key={item.productCode}
                  variant="outlined"
                  sx={{
                    cursor: isFull ? "not-allowed" : "pointer",
                    opacity: isFull ? 0.6 : 1,
                    bgcolor:
                      pendingScan.productCode === item.productCode
                        ? "action.selected"
                        : "background.paper",
                  }}
                  onClick={() =>
                    !isFull &&
                    setPendingScan((prev) => ({
                      ...prev,
                      productCode: item.productCode,
                    }))
                  }
                >
                  <CardContent sx={{ py: 1, px: 2, "&:last-child": { pb: 1 } }}>
                    <FormControlLabel
                      control={
                        <Radio
                          checked={pendingScan.productCode === item.productCode}
                          onChange={() =>
                            setPendingScan((prev) => ({
                              ...prev,
                              productCode: item.productCode,
                            }))
                          }
                          disabled={isFull}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {item.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.productCode} — {total.received}/
                            {total.ordered}
                          </Typography>
                        </Box>
                      }
                      sx={{ width: "100%", m: 0 }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingScan(null)}>
            {t("basic.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleIdentifySubmit}
            disabled={!pendingScan.productCode}
          >
            {t("receivePoStock.addScan", "Add")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderAmendDialog = () => (
    <Dialog
      open={amendDialogOpen}
      onClose={() => setAmendDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{t("receivePoStock.amendDialogTitle")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("receivePoStock.amendDialogBody")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("receivePoStock.product")}</TableCell>
                <TableCell align="right">
                  {t("receivePoStock.orderedQty")}
                </TableCell>
                <TableCell align="right">
                  {t("receivePoStock.newQty")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {amendItems.map((item) => (
                <TableRow key={item.productCode}>
                  <TableCell>
                    {item.productName}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {item.productCode}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={item.quantity}
                      onChange={(e) =>
                        handleAmendItemChange(item.productCode, e.target.value)
                      }
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAmendDialogOpen(false)} disabled={amending}>
          {t("basic.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleAmendPo}
          disabled={amending}
          startIcon={
            amending ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {t("receivePoStock.amendConfirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {renderHeader()}

      {!isPda && (
        <HelpDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={t("receivePoStock.helpTitle")}
          content={t("receivePoStock.helpBody")}
        />
      )}

      {renderAlerts()}
      {renderSelectors()}

      {orderLoading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t("receivePoStock.loadingOrder")}
          </Typography>
        </Box>
      )}

      {order && !orderLoading && !completedResult && (
        <>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {order.orderId}
            </Typography>
            <Chip
              label={order.orderStatus || "READY"}
              size="small"
              color="primary"
            />
            {order.vendorName && (
              <Typography variant="body2" color="text.secondary">
                {t("receivePoStock.vendor")}: {order.vendorName}
              </Typography>
            )}
          </Box>

          {renderScanArea()}
          {isPda ? renderScannedItemsCards() : renderScannedItemsTable()}
          {renderLineProgress()}
          {renderWarnings()}
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}
          {successMsg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMsg}
            </Alert>
          )}
          {renderPhotoPanel()}
          {renderActions()}
        </>
      )}

      {renderIdentifyDialog()}
      {renderAmendDialog()}

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </Box>
  );
}
