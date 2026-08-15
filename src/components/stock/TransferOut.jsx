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
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CompareArrows as CompareArrowsIcon,
  OpenInNew as OpenInNewIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import { PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useTransferOut from "../../hooks/useTransferOut";
import { ThumbnailImg, ImageCarousel } from "../../helpers/file_helper";

export default function TransferOut() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useTransferOut();
  const [locationScanInput, setLocationScanInput] = React.useState("");
  const [scanInput, setScanInput] = React.useState("");
  const scanInputRef = React.useRef(null);
  const [carouselOpen, setCarouselOpen] = React.useState(false);
  const [carouselStart, setCarouselStart] = React.useState(0);

  const {
    isPda,
    helpOpen,
    setHelpOpen,
    actionByLabel,
    deliveryOrders,
    dosLoading,
    selectedDoId,
    setSelectedDoId,
    selectedDo,
    doItems,
    scannedLocation,
    locationGpsBusy,
    locationGpsFailed,
    handleAutoDetectLocation,
    handleScanLocation,
    handleClearLocation,
    toLocation,
    productMap,
    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,
    pendingProductChoice,
    handleSelectProduct,
    handleCancelProductChoice,
    transferPhotos,
    photoUploading,
    handleAddTransferPhoto,
    handleRemoveTransferPhoto,
    lineTotals,
    quantityWarnings,
    busy,
    errorMsg,
    successMsg,
    completedResult,
    canExecute,
    handleExecute,
    handleReset,
  } = hook;

  const focusScanInput = () => {
    const input = scanInputRef.current?.inputRef?.current;
    if (input) input.focus();
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleAddTransferPhoto(file);
    event.target.value = "";
  };

  const selectedDoOption = selectedDo || null;

  const carouselImages = transferPhotos.map((ph) => ({
    displayUrl: ph.metadata?.viewUrl || ph.localUrl || null,
    viewUrl: ph.metadata?.viewUrl || null,
    title: ph.metadata?.name || "",
    provider: ph.metadata?.provider || null,
    meta: ph.metadata || null,
  }));

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("transferOut.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("transferOut.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("transferOut.title")}
        subtitle={t("transferOut.subtitle")}
        icon={CompareArrowsIcon}
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
              {t("transferOut.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("transferOut.pdfStored", {
                  fileName: completedResult.pdfResult.fileName,
                })}
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                onClick={() => navigate(isPda ? "/pda/orders" : "/workorder")}
              >
                {t("transferOut.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("transferOut.transferAnother")}
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
        options={deliveryOrders}
        getOptionLabel={(option) => option?.orderId || ""}
        value={selectedDoOption}
        onChange={(_, newValue) => {
          setSelectedDoId(newValue?.orderId || "");
        }}
        loading={dosLoading}
        disabled={busy || Boolean(completedResult)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t("transferOut.selectDo")}
            placeholder={t("transferOut.selectDoPlaceholder")}
            size="small"
          />
        )}
      />

      {scannedLocation ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            bgcolor: "action.selected",
            borderRadius: 1,
            border: "1px solid var(--color-gray-300)",
          }}
        >
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            {scannedLocation}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleClearLocation}
            disabled={busy || Boolean(completedResult)}
          >
            {t("transferOut.changeLocation")}
          </Button>
        </Box>
      ) : locationGpsBusy ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t("transferOut.detectingLocation")}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleAutoDetectLocation}
            disabled={busy}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("transferOut.detectByGps")}
          </Button>
          {locationGpsFailed && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              {t("transferOut.gpsLocationFailed")}
            </Alert>
          )}
          <StockCodeScanInput
            value={locationScanInput}
            onChange={setLocationScanInput}
            onSubmit={(value) => {
              handleScanLocation(value).then(() => {
                setLocationScanInput("");
                focusScanInput();
              });
            }}
            busy={busy}
            label={t("transferOut.fromLocation")}
            placeholder={t("transferOut.fromLocationPlaceholder")}
            submitLabel={t("transferOut.setLocation", "Set Location")}
            showSubmitButton
            allowProductSearch={false}
          />
        </Box>
      )}
    </Box>
  );

  const renderOrderHeader = () => {
    if (!selectedDo) return null;
    return (
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
          {selectedDo.orderId}
        </Typography>
        <Chip
          label={selectedDo.orderStatus || "ISSUED"}
          size="small"
          color="primary"
        />
        {selectedDo.customerId && (
          <Typography variant="body2" color="text.secondary">
            {t("transferOut.customer")}: {selectedDo.customerId}
          </Typography>
        )}
      </Box>
    );
  };

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("transferOut.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderScanArea = () => {
    if (!selectedDo || dosLoading || completedResult) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("transferOut.scanTitle")}
        </Typography>
        <StockCodeScanInput
          ref={scanInputRef}
          value={scanInput}
          onChange={setScanInput}
          onSubmit={(value) => {
            setScanInput("");
            handleScanSubmit(value);
          }}
          placeholder={t("transferOut.scanPlaceholder")}
          showSubmitButton={false}
          busy={busy}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block" }}
        >
          {t("transferOut.scanHint")}
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
                {t("transferOut.stockCode")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {t("transferOut.product")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                {t("transferOut.qty")}
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
                  {productMap[scan.productCode] || scan.productCode || "-"}
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
        {scannedItems.map((scan, index) => (
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
                    {productMap[scan.productCode] || scan.productCode || "-"}
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
                    label={t("transferOut.qty")}
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
        ))}
      </Box>
    );
  };

  const renderLineProgress = () => {
    if (doItems.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("transferOut.lineProgress")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: "background.default" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t("transferOut.product")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t("transferOut.orderedQty")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t("transferOut.transferredQty")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  {t("transferOut.status")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doItems.map((item) => {
                const total = lineTotals[item.productCode] || {
                  ordered: item.quantity,
                  transferred: 0,
                };
                const isComplete = total.transferred === total.ordered;
                const isOver = total.transferred > total.ordered;
                return (
                  <TableRow key={item.productCode} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {item.productName ||
                          productMap[item.productCode] ||
                          item.productCode}
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
                        {total.transferred}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isComplete ? (
                        <Chip
                          size="small"
                          color="success"
                          label={t("transferOut.complete")}
                        />
                      ) : (
                        <Chip
                          size="small"
                          color={isOver ? "error" : "default"}
                          label={
                            isOver
                              ? t("transferOut.over")
                              : t("transferOut.pending")
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

  const renderWarnings = () => {
    if (quantityWarnings.length === 0) return null;

    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t("transferOut.quantityMismatchTitle")}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {quantityWarnings.map((warning) => (
            <li key={warning.productCode}>
              <Typography variant="body2">
                {t("transferOut.quantityMismatch", {
                  productName: warning.productName,
                  transferred: warning.transferred,
                  ordered: warning.ordered,
                })}
              </Typography>
            </li>
          ))}
        </Box>
      </Alert>
    );
  };

  const renderIdentifyDialog = () => (
    <Dialog
      open={Boolean(pendingProductChoice)}
      onClose={handleCancelProductChoice}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t("transferOut.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("transferOut.chooseProductBody", {
            stockCode: pendingProductChoice?.stockId,
          })}
        </Typography>
        <List dense disablePadding>
          {(pendingProductChoice?.options || []).map((option) => (
            <ListItemButton
              key={option.productId}
              onClick={() =>
                handleSelectProduct(pendingProductChoice.stockId, option)
              }
              disabled={busy}
            >
              <ListItemText
                primary={
                  productMap[option.productCode] || option.productCode || "-"
                }
                secondary={`Product ID: ${option.productId}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelProductChoice} disabled={busy}>
          {t("transferOut.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPhotoPanel = () => {
    if (!selectedDo || dosLoading || completedResult) return null;

    return (
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("transferOut.photos")}{" "}
          <Typography component="span" variant="caption" color="text.secondary">
            ({transferPhotos.length})
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
          {transferPhotos.map((p, i) => (
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
                onClick={() => handleRemoveTransferPhoto(i)}
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
                if (file) handleAddTransferPhoto(file);
                e.target.value = "";
              }}
            />
          </Box>
        </Box>
        {transferPhotos.length === 0 && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ mt: 0.5, display: "block" }}
          >
            {t("transferOut.photoRequired")}
          </Typography>
        )}
      </Box>
    );
  };

  const renderActions = () => {
    if (!selectedDo) return null;

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
          {busy ? t("transferOut.executing") : t("transferOut.execute")}
        </Button>
        {!isPda && (
          <Button variant="outlined" onClick={handleReset} disabled={busy}>
            {t("transferOut.reset")}
          </Button>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {renderHeader()}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("transferOut.helpTitle")}
        content={t("transferOut.helpBody")}
      />
      {renderAlerts()}
      {renderActionBy()}
      {renderSelectors()}

      {dosLoading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t("transferOut.loadingOrder")}
          </Typography>
        </Box>
      )}

      {selectedDo && !dosLoading && !completedResult && (
        <>
          {renderOrderHeader()}
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

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </Box>
  );
}
