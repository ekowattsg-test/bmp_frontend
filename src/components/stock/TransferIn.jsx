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
  Card,
  CardContent,
  CircularProgress,
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
import useTransferIn from "../../hooks/useTransferIn";
import { ThumbnailImg, ImageCarousel } from "../../helpers/file_helper";

export default function TransferIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useTransferIn();
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
    fromLocation,
    handleScanFromLocation,
    handleClearFromLocation,
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
    setErrorMsg,
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
            {t("transferIn.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("transferIn.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("transferIn.title")}
        subtitle={t("transferIn.subtitle")}
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
              {t("transferIn.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("transferIn.pdfStored", {
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
                {t("transferIn.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("transferIn.transferAnother")}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
    </>
  );

  const renderDoSelector = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("transferIn.selectDo")}
        </Typography>
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
              label={t("transferIn.selectDo")}
              placeholder={t("transferIn.selectDoPlaceholder")}
              size="small"
            />
          )}
        />
      </CardContent>
    </Card>
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
            label={t("transferIn.selectDo")}
            placeholder={t("transferIn.selectDoPlaceholder")}
            size="small"
          />
        )}
      />

      {fromLocation ? (
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
            {fromLocation}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleClearFromLocation}
            disabled={busy || Boolean(completedResult)}
          >
            {t("transferIn.changeLocation")}
          </Button>
        </Box>
      ) : locationGpsBusy ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t("transferIn.detectingLocation")}
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
            {t("transferIn.detectByGps")}
          </Button>
          {locationGpsFailed && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              {t("transferIn.gpsLocationFailed")}
            </Alert>
          )}
          <StockCodeScanInput
            value={locationScanInput}
            onChange={setLocationScanInput}
            onSubmit={(value) => {
              handleScanFromLocation(value).then(() => {
                setLocationScanInput("");
                focusScanInput();
              });
            }}
            busy={busy}
            label={t("transferIn.fromLocation")}
            placeholder={t("transferIn.fromLocationPlaceholder")}
            submitLabel={t("transferIn.setLocation", "Set Location")}
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
          label={selectedDo.orderStatus || "IN_TRANSIT"}
          size="small"
          color="primary"
        />
        {selectedDo.customerId && (
          <Typography variant="body2" color="text.secondary">
            {t("transferIn.customer")}: {selectedDo.customerId}
          </Typography>
        )}
      </Box>
    );
  };

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("transferIn.actionBy", { name: actionByLabel || "-" })}
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
          {t("transferIn.scanTitle")}
        </Typography>
        <StockCodeScanInput
          ref={scanInputRef}
          value={scanInput}
          onChange={setScanInput}
          onSubmit={(value) => {
            setScanInput("");
            handleScanSubmit(value);
          }}
          placeholder={t("transferIn.scanPlaceholder")}
          showSubmitButton={false}
          busy={busy}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block" }}
        >
          {t("transferIn.scanHint")}
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
                {t("transferIn.stockCode")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {t("transferIn.product")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                {t("transferIn.qty")}
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
                    label={t("transferIn.qty")}
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
          {t("transferIn.lineProgress")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: "background.default" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t("transferIn.product")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t("transferIn.orderedQty")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t("transferIn.receivedQty")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  {t("transferIn.status")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doItems.map((item) => {
                const total = lineTotals[item.productCode] || {
                  ordered: item.quantity,
                  received: 0,
                };
                const isComplete = total.received === total.ordered;
                const isOver = total.received > total.ordered;
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
                        {total.received}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isComplete ? (
                        <Chip
                          size="small"
                          color="success"
                          label={t("transferIn.complete")}
                        />
                      ) : (
                        <Chip
                          size="small"
                          color={isOver ? "error" : "default"}
                          label={
                            isOver
                              ? t("transferIn.over")
                              : t("transferIn.pending")
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
          {t("transferIn.quantityMismatchTitle")}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {quantityWarnings.map((warning) => (
            <li key={warning.productCode}>
              <Typography variant="body2">
                {t("transferIn.quantityMismatch", {
                  productName: warning.productName,
                  received: warning.received,
                  ordered: warning.ordered,
                })}
              </Typography>
            </li>
          ))}
        </Box>
      </Alert>
    );
  };

  const renderPhotoPanel = () => {
    if (!selectedDo || dosLoading || completedResult) return null;

    return (
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("transferIn.photos")}{" "}
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
            {t("transferIn.photoRequired")}
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
          {busy ? t("transferIn.executing") : t("transferIn.execute")}
        </Button>
        {!isPda && (
          <Button variant="outlined" onClick={handleReset} disabled={busy}>
            {t("transferIn.reset")}
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
        title={t("transferIn.helpTitle")}
        content={t("transferIn.helpBody")}
      />
      {renderAlerts()}
      {renderActionBy()}
      {renderSelectors()}

      {dosLoading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t("transferIn.loadingOrder")}
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

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        startIndex={carouselStart}
      />
    </Box>
  );
}
