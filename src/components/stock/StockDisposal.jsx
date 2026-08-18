import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  OpenInNew as OpenInNewIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import { PageHeader, LocationScanner } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useStockDisposal from "../../hooks/useStockDisposal";

export default function StockDisposal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useStockDisposal();
  const [scanInput, setScanInput] = React.useState("");
  const scanInputRef = React.useRef(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const {
    isPda,
    helpOpen,
    setHelpOpen,
    fromLocation,
    setFromLocation,
    handleClearLocation,
    actionByLabel,
    disposalReason,
    setDisposalReason,
    disposalMethod,
    setDisposalMethod,
    reasonOptions,
    methodOptions,
    productMap,
    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,
    busy,
    errorMsg,
    successMsg,
    completedResult,
    canExecute,
    handleExecute,
    handleReset,
    pendingProductChoice,
    handleSelectProduct,
    handleCancelProductChoice,
    disposalPhotos,
    photoUploading,
    handleAddDisposalPhoto,
    handleRemoveDisposalPhoto,
  } = hook;

  const focusStockInput = () => {
    const input = scanInputRef.current?.inputRef?.current;
    if (input) input.focus();
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleAddDisposalPhoto(file);
    event.target.value = "";
  };

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("stockDisposal.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("stockDisposal.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("stockDisposal.title")}
        subtitle={t("stockDisposal.subtitle")}
        icon={DeleteSweepIcon}
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
              {t("stockDisposal.disposalCreated", {
                disposalId: completedResult.disposalId,
              })}
            </Typography>
            <Typography variant="body2">
              {t("stockDisposal.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("stockDisposal.pdfStored", {
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
                {t("stockDisposal.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("stockDisposal.disposeAnother")}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}
    </>
  );

  const renderLocationScan = () => (
    <LocationScanner
      value={fromLocation}
      onChange={setFromLocation}
      gpsEnabled
      autoDetectGpsOnMount={false}
      disabled={busy || Boolean(completedResult)}
      onScanSuccess={focusStockInput}
      title={t("stockDisposal.scanLocationTitle")}
      labels={{
        detectByGps: t("stockDisposal.detectByGps"),
        detectingLocation: t("stockDisposal.detectingLocation"),
        gpsLocationFailed: t("stockDisposal.gpsLocationFailed"),
        changeLocation: t("stockDisposal.changeLocation"),
        scanLabel: t("stockDisposal.fromLocation"),
        scanPlaceholder: t("stockDisposal.fromLocationPlaceholder"),
      }}
    />
  );

  const renderReasonMethod = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("stockDisposal.reasonMethodTitle")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl
            sx={{ minWidth: 200 }}
            size="small"
            disabled={busy || Boolean(completedResult)}
          >
            <InputLabel id="disposal-reason-label">
              {t("stockDisposal.reason")}
            </InputLabel>
            <Select
              labelId="disposal-reason-label"
              value={disposalReason}
              label={t("stockDisposal.reason")}
              onChange={(event) => setDisposalReason(event.target.value)}
            >
              {reasonOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`stockDisposal.reason_${option.toLowerCase()}`, option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            sx={{ minWidth: 200 }}
            size="small"
            disabled={busy || Boolean(completedResult)}
          >
            <InputLabel id="disposal-method-label">
              {t("stockDisposal.method")}
            </InputLabel>
            <Select
              labelId="disposal-method-label"
              value={disposalMethod}
              label={t("stockDisposal.method")}
              onChange={(event) => setDisposalMethod(event.target.value)}
            >
              {methodOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`stockDisposal.method_${option.toLowerCase()}`, option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("stockDisposal.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderScanInput = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("stockDisposal.scanSectionTitle")}
        </Typography>
        <StockCodeScanInput
          ref={scanInputRef}
          value={scanInput}
          onChange={setScanInput}
          onSubmit={(value) => {
            handleScanSubmit(value);
            setScanInput("");
          }}
          busy={busy}
          label={t("stockDisposal.stockCodeLabel")}
          placeholder={t("stockDisposal.stockCodePlaceholder")}
          submitLabel={t("stockDisposal.add")}
          showSubmitButton={false}
          allowProductSearch={false}
          disabled={!fromLocation || !disposalReason || !disposalMethod || busy}
        />
      </CardContent>
    </Card>
  );

  const renderScannedTable = () => {
    if (scannedItems.length === 0) return null;

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ mb: 3, borderColor: "var(--color-gray-300)" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "background.default" }}>
              <TableCell>{t("stockDisposal.product")}</TableCell>
              <TableCell>{t("stockDisposal.stockCode")}</TableCell>
              <TableCell align="right">
                {t("stockDisposal.available")}
              </TableCell>
              <TableCell align="right">{t("stockDisposal.quantity")}</TableCell>
              <TableCell align="right">{t("stockDisposal.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scannedItems.map((item, index) => (
              <TableRow
                key={`${item.stockId}-${index}`}
                sx={{ "&:hover": { backgroundColor: "action.hover" } }}
              >
                <TableCell>
                  {productMap[item.productCode] || item.productCode}
                </TableCell>
                <TableCell>{item.stockId}</TableCell>
                <TableCell align="right">{item.available ?? 0}</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>
                  <TextField
                    type="number"
                    size="small"
                    value={item.subQuantity}
                    onChange={(event) =>
                      handleUpdateScan(index, "subQuantity", event.target.value)
                    }
                    inputProps={{
                      min: 1,
                      max: item.available ?? undefined,
                      style: { textAlign: "right" },
                    }}
                    disabled={busy || Boolean(completedResult)}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveScan(index)}
                    disabled={busy || Boolean(completedResult)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderProductChoiceDialog = () => (
    <Dialog
      open={Boolean(pendingProductChoice)}
      onClose={handleCancelProductChoice}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t("stockDisposal.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("stockDisposal.chooseProductBody", {
            stockCode: pendingProductChoice?.stockId || "",
          })}
        </Typography>
        <List>
          {pendingProductChoice?.options?.map((option) => (
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
          {t("stockDisposal.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPhotos = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("stockDisposal.photosTitle")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {disposalPhotos.map((photo, index) => (
            <Box
              key={index}
              sx={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid var(--color-gray-300)",
                cursor: "pointer",
              }}
              onClick={() => {
                setViewerIndex(index);
                setViewerOpen(true);
              }}
            >
              <img
                src={photo.localUrl}
                alt={t("stockDisposal.photoAlt", { index: index + 1 })}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {!completedResult && (
                <IconButton
                  size="small"
                  color="error"
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bgcolor: "rgba(255,255,255,0.85)",
                    p: 0.25,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveDisposalPhoto(index);
                  }}
                  disabled={busy}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}

          {!completedResult && (
            <Button
              component="label"
              variant="outlined"
              startIcon={<CameraAltIcon />}
              disabled={busy || photoUploading}
              sx={{
                minWidth: 72,
                height: 72,
                flexDirection: "column",
                borderStyle: "dashed",
              }}
            >
              {photoUploading ? (
                <CircularProgress size={16} />
              ) : (
                t("stockDisposal.addPhoto")
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoSelect}
              />
            </Button>
          )}
        </Box>
      </CardContent>
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            p: 1,
          }}
        >
          {disposalPhotos[viewerIndex] && (
            <img
              src={disposalPhotos[viewerIndex].localUrl}
              alt={t("stockDisposal.photoAlt", { index: viewerIndex + 1 })}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );

  const renderSummary = () => {
    const totalItems = scannedItems.length;
    const totalQuantity = scannedItems.reduce(
      (sum, item) => sum + Number(item.subQuantity || 0),
      0,
    );

    return (
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
          alignItems: "center",
        }}
      >
        <Chip
          label={t("stockDisposal.summaryItems", { count: totalItems })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("stockDisposal.summaryQuantity", { count: totalQuantity })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("stockDisposal.summaryLocation", {
            name: fromLocation || "-",
          })}
          color="info"
          variant="outlined"
        />
      </Box>
    );
  };

  const renderActions = () => (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
      <Button
        variant="contained"
        color="primary"
        disabled={!canExecute || busy || Boolean(completedResult)}
        onClick={handleExecute}
      >
        {busy ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          t("stockDisposal.execute")
        )}
      </Button>
      <Button variant="outlined" disabled={busy} onClick={handleReset}>
        {t("stockDisposal.reset")}
      </Button>
    </Box>
  );

  return (
    <Box>
      {renderHeader()}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockDisposal.helpTitle")}
        content={t("stockDisposal.helpBody")}
      />
      {renderAlerts()}
      {renderActionBy()}
      {renderLocationScan()}
      {fromLocation && renderReasonMethod()}
      {fromLocation && disposalReason && disposalMethod && renderScanInput()}
      {renderScannedTable()}
      {scannedItems.length > 0 && renderPhotos()}
      {scannedItems.length > 0 && renderSummary()}
      {renderActions()}
      {renderProductChoiceDialog()}
    </Box>
  );
}
