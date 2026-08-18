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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { PageHeader, LocationScanner } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useTransferReturnIn from "../../hooks/useTransferReturnIn";

export default function TransferReturnIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useTransferReturnIn();
  const [scanInput, setScanInput] = React.useState("");
  const scanInputRef = React.useRef(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const {
    isPda,
    helpOpen,
    setHelpOpen,
    actionByLabel,
    deliveryOrders,
    selectedDo,
    doItems,
    handleSelectDo,
    handleClearDo,
    returnLocation,
    setReturnLocation,
    handleClearLocation,
    productMap,
    scannedItems,
    handleScanSubmit,
    handleUpdateScan,
    handleRemoveScan,
    returnPhotos,
    photoUploading,
    handleAddReturnPhoto,
    handleRemoveReturnPhoto,
    pendingProductChoice,
    handleSelectProduct,
    handleCancelProductChoice,
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
    handleAddReturnPhoto(file);
    event.target.value = "";
  };

  const selectedDoOption = selectedDo || null;

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("transferReturnIn.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("transferReturnIn.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("transferReturnIn.title")}
        subtitle={t("transferReturnIn.subtitle")}
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
              {t("transferReturnIn.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.returnId && (
              <Typography variant="body2">
                {t("transferReturnIn.returnCreated", {
                  returnId: completedResult.returnId,
                })}
              </Typography>
            )}
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("transferReturnIn.pdfStored", {
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
                {t("transferReturnIn.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("transferReturnIn.returnAnother")}
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

  const renderDoSelector = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("transferReturnIn.selectDo")}
        </Typography>
        <Autocomplete
          options={deliveryOrders}
          getOptionLabel={(option) => option?.orderId || ""}
          value={selectedDoOption}
          onChange={(_, newValue) => {
            if (newValue) {
              handleSelectDo(newValue.orderId);
            } else {
              handleClearDo();
            }
          }}
          disabled={busy || Boolean(completedResult)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("transferReturnIn.selectDo")}
              placeholder={t("transferReturnIn.selectDoPlaceholder")}
              size="small"
            />
          )}
        />
      </CardContent>
    </Card>
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
          label={selectedDo.orderStatus || "DELIVERED"}
          size="small"
          color="primary"
        />
        {selectedDo.customerId && (
          <Typography variant="body2" color="text.secondary">
            {t("transferReturnIn.customer")}: {selectedDo.customerId}
          </Typography>
        )}
      </Box>
    );
  };

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("transferReturnIn.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderLocationScan = () =>
    selectedDo ? (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <LocationScanner
            value={returnLocation}
            onChange={setReturnLocation}
            gpsEnabled
            autoDetectGpsOnMount={false}
            disabled={busy || Boolean(completedResult)}
            onScanSuccess={focusScanInput}
            labels={{
              detectByGps: t("transferReturnIn.detectByGps"),
              detectingLocation: t("transferReturnIn.detectingLocation"),
              gpsLocationFailed: t("transferReturnIn.gpsLocationFailed"),
              changeLocation: t("transferReturnIn.changeLocation"),
              scanLabel: t("transferReturnIn.toLocation"),
              scanPlaceholder: t("transferReturnIn.toLocationPlaceholder"),
            }}
          />
        </CardContent>
      </Card>
    ) : null;

  const renderScanArea = () => {
    if (!selectedDo || !returnLocation || completedResult) return null;

    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {t("transferReturnIn.scanTitle")}
          </Typography>
          <StockCodeScanInput
            ref={scanInputRef}
            value={scanInput}
            onChange={setScanInput}
            onSubmit={(value) => {
              setScanInput("");
              handleScanSubmit(value);
            }}
            placeholder={t("transferReturnIn.scanPlaceholder")}
            showSubmitButton={false}
            busy={busy}
          />
        </CardContent>
      </Card>
    );
  };

  const renderScannedItemsTable = () => {
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
              <TableCell>{t("transferReturnIn.product")}</TableCell>
              <TableCell>{t("transferReturnIn.stockCode")}</TableCell>
              <TableCell align="right">
                {t("transferReturnIn.returnable")}
              </TableCell>
              <TableCell align="right">{t("transferReturnIn.qty")}</TableCell>
              <TableCell align="right">
                {t("transferReturnIn.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scannedItems.map((scan, index) => (
              <TableRow
                key={`${scan.stockId}-${index}`}
                sx={{ "&:hover": { backgroundColor: "action.hover" } }}
              >
                <TableCell>
                  {productMap[scan.productCode] || scan.productCode || "-"}
                </TableCell>
                <TableCell>{scan.stockId}</TableCell>
                <TableCell align="right">{scan.returnable ?? 0}</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{
                      min: 1,
                      max: scan.returnable ?? undefined,
                      step: 1,
                    }}
                    value={scan.subQuantity}
                    onChange={(e) =>
                      handleUpdateScan(index, "subQuantity", e.target.value)
                    }
                    disabled={busy}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell align="right">
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

  const renderProductChoiceDialog = () => (
    <Dialog
      open={Boolean(pendingProductChoice)}
      onClose={handleCancelProductChoice}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t("transferReturnIn.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("transferReturnIn.chooseProductBody", {
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
          {t("transferReturnIn.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPhotoPanel = () => {
    if (scannedItems.length === 0 || completedResult) return null;

    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {t("transferReturnIn.photos")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
            }}
          >
            {returnPhotos.map((p, i) => (
              <Box
                key={i}
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
                  setViewerIndex(i);
                  setViewerOpen(true);
                }}
              >
                <img
                  src={p.localUrl}
                  alt={t("transferReturnIn.photoAlt", { index: i + 1 })}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
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
                    handleRemoveReturnPhoto(i);
                  }}
                  disabled={busy}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
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
                t("transferReturnIn.addPhoto")
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoSelect}
              />
            </Button>
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
            {returnPhotos[viewerIndex] && (
              <img
                src={returnPhotos[viewerIndex].localUrl}
                alt={t("transferReturnIn.photoAlt", { index: viewerIndex + 1 })}
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
  };

  const renderLineSummary = () => {
    if (doItems.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("transferReturnIn.doLineSummary")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "background.default" }}>
                <TableCell>{t("transferReturnIn.product")}</TableCell>
                <TableCell align="right">
                  {t("transferReturnIn.deliveredQty")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doItems.map((item) => (
                <TableRow key={item.id || item.productCode} hover>
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
                  <TableCell align="right">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

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
          label={t("transferReturnIn.summaryItems", { count: totalItems })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("transferReturnIn.summaryQuantity", {
            count: totalQuantity,
          })}
          color="primary"
          variant="outlined"
        />
        {selectedDo && (
          <Chip
            label={t("transferReturnIn.summaryDo", {
              orderId: selectedDo.orderId,
            })}
            color="info"
            variant="outlined"
          />
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
          {busy
            ? t("transferReturnIn.executing")
            : t("transferReturnIn.execute")}
        </Button>
        {!isPda && (
          <Button variant="outlined" onClick={handleReset} disabled={busy}>
            {t("transferReturnIn.reset")}
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
        title={t("transferReturnIn.helpTitle")}
        content={t("transferReturnIn.helpBody")}
      />
      {renderAlerts()}
      {renderActionBy()}
      {renderDoSelector()}
      {selectedDo && (
        <>
          {renderOrderHeader()}
          {renderLineSummary()}
          {renderLocationScan()}
          {renderScanArea()}
          {renderScannedItemsTable()}
          {renderPhotoPanel()}
          {scannedItems.length > 0 && renderSummary()}
          {renderActions()}
        </>
      )}
      {renderProductChoiceDialog()}
    </Box>
  );
}
