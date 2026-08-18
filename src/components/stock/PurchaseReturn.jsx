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
  Reply as ReplyIcon,
  OpenInNew as OpenInNewIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import { PageHeader, LocationScanner } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import usePurchaseReturn from "../../hooks/usePurchaseReturn";

export default function PurchaseReturn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = usePurchaseReturn();
  const [scanInput, setScanInput] = React.useState("");
  const scanInputRef = React.useRef(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const {
    isPda,
    helpOpen,
    setHelpOpen,
    actionByLabel,
    purchaseOrders,
    selectedPo,
    poItems,
    handleSelectPo,
    handleClearPo,
    sourceLocation,
    setSourceLocation,
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

  const selectedPoOption = selectedPo || null;

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("purchaseReturn.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("purchaseReturn.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("purchaseReturn.title")}
        subtitle={t("purchaseReturn.subtitle")}
        icon={ReplyIcon}
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
              {t("purchaseReturn.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.returnId && (
              <Typography variant="body2">
                {t("purchaseReturn.returnCreated", {
                  returnId: completedResult.returnId,
                })}
              </Typography>
            )}
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("purchaseReturn.pdfStored", {
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
                {t("purchaseReturn.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("purchaseReturn.returnAnother")}
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

  const renderPoSelector = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("purchaseReturn.selectPo")}
        </Typography>
        <Autocomplete
          options={purchaseOrders}
          getOptionLabel={(option) => option?.orderId || ""}
          value={selectedPoOption}
          onChange={(_, newValue) => {
            if (newValue) {
              handleSelectPo(newValue.orderId);
            } else {
              handleClearPo();
            }
          }}
          disabled={busy || Boolean(completedResult)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("purchaseReturn.selectPo")}
              placeholder={t("purchaseReturn.selectPoPlaceholder")}
              size="small"
            />
          )}
        />
      </CardContent>
    </Card>
  );

  const renderOrderHeader = () => {
    if (!selectedPo) return null;
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
          {selectedPo.orderId}
        </Typography>
        <Chip
          label={selectedPo.orderStatus || "RECEIVED"}
          size="small"
          color="primary"
        />
        {selectedPo.vendorId && (
          <Typography variant="body2" color="text.secondary">
            {t("purchaseReturn.vendor")}:{" "}
            {selectedPo.vendorName || selectedPo.vendorId}
          </Typography>
        )}
      </Box>
    );
  };

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("purchaseReturn.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderLocationScan = () =>
    selectedPo ? (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <LocationScanner
            value={sourceLocation}
            onChange={setSourceLocation}
            gpsEnabled
            autoDetectGpsOnMount={false}
            disabled={busy || Boolean(completedResult)}
            onScanSuccess={focusScanInput}
            labels={{
              detectByGps: t("purchaseReturn.detectByGps"),
              detectingLocation: t("purchaseReturn.detectingLocation"),
              gpsLocationFailed: t("purchaseReturn.gpsLocationFailed"),
              changeLocation: t("purchaseReturn.changeLocation"),
              scanLabel: t("purchaseReturn.fromLocation"),
              scanPlaceholder: t("purchaseReturn.fromLocationPlaceholder"),
            }}
          />
        </CardContent>
      </Card>
    ) : null;

  const renderScanArea = () => {
    if (!selectedPo || !sourceLocation || completedResult) return null;

    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            {t("purchaseReturn.scanTitle")}
          </Typography>
          <StockCodeScanInput
            ref={scanInputRef}
            value={scanInput}
            onChange={setScanInput}
            onSubmit={(value) => {
              setScanInput("");
              handleScanSubmit(value);
            }}
            placeholder={t("purchaseReturn.scanPlaceholder")}
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
              <TableCell>{t("purchaseReturn.product")}</TableCell>
              <TableCell>{t("purchaseReturn.stockCode")}</TableCell>
              <TableCell align="right">
                {t("purchaseReturn.returnable")}
              </TableCell>
              <TableCell align="right">{t("purchaseReturn.qty")}</TableCell>
              <TableCell align="right">{t("purchaseReturn.actions")}</TableCell>
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
                      max: scan.returnable ?? 1,
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
      <DialogTitle>{t("purchaseReturn.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("purchaseReturn.chooseProductBody", {
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
                secondary={`${t("purchaseReturn.returnable")}: ${option.returnable ?? 0}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelProductChoice} disabled={busy}>
          {t("purchaseReturn.cancel")}
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
            {t("purchaseReturn.photos")}
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
                  alt={t("purchaseReturn.photoAlt", { index: i + 1 })}
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
                t("purchaseReturn.addPhoto")
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
                alt={t("purchaseReturn.photoAlt", { index: viewerIndex + 1 })}
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
    if (poItems.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {t("purchaseReturn.poLineSummary")}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "background.default" }}>
                <TableCell>{t("purchaseReturn.product")}</TableCell>
                <TableCell align="right">
                  {t("purchaseReturn.receivedQty")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poItems.map((item) => (
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
          label={t("purchaseReturn.summaryItems", { count: totalItems })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("purchaseReturn.summaryQuantity", { count: totalQuantity })}
          color="primary"
          variant="outlined"
        />
        {selectedPo && (
          <Chip
            label={t("purchaseReturn.summaryPo", {
              orderId: selectedPo.orderId,
            })}
            color="info"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  const renderActions = () => {
    if (!selectedPo) return null;

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
          {busy ? t("purchaseReturn.executing") : t("purchaseReturn.execute")}
        </Button>
        {!isPda && (
          <Button variant="outlined" onClick={handleReset} disabled={busy}>
            {t("purchaseReturn.reset")}
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
        title={t("purchaseReturn.helpTitle")}
        content={t("purchaseReturn.helpBody")}
      />
      {renderAlerts()}
      {renderActionBy()}
      {renderPoSelector()}
      {selectedPo && (
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
