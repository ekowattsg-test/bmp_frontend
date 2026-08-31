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
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Handyman as HandymanIcon,
  OpenInNew as OpenInNewIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import { PageHeader, LocationScanner } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useAssetReturn from "../../hooks/useAssetReturn";

export default function AssetReturn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useAssetReturn();
  const [workerScanInput, setWorkerScanInput] = React.useState("");
  const [scanInput, setScanInput] = React.useState("");
  const scanInputRef = React.useRef(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const {
    isPda,
    helpOpen,
    setHelpOpen,
    returnLocation,
    setReturnLocation,
    handleClearLocation,
    actionByLabel,
    returnFromStaffId,
    returnFromStaffName,
    handleScanWorker,
    handleClearWorker,
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
    returnPhotos,
    photoUploading,
    handleAddReturnPhoto,
    handleRemoveReturnPhoto,
  } = hook;

  const focusStockInput = () => {
    const input = scanInputRef.current?.inputRef?.current;
    if (input) input.focus();
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleAddReturnPhoto(file);
    event.target.value = "";
  };

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("assetReturn.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("assetReturn.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("assetReturn.title")}
        subtitle={t("assetReturn.subtitle")}
        icon={HandymanIcon}
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
              {t("assetReturn.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("assetReturn.pdfStored", {
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
                {t("assetReturn.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("assetReturn.returnAnother")}
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

  const renderWorkerScan = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetReturn.scanWorkerTitle")}
        </Typography>
        {returnFromStaffId ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              p: 1.5,
              bgcolor: "action.selected",
              borderRadius: 1,
              border: "1px solid var(--color-gray-300)",
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
              {returnFromStaffName || "-"}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearWorker}
              disabled={busy || Boolean(completedResult)}
            >
              {t("assetReturn.changeWorker")}
            </Button>
          </Box>
        ) : (
          <StockCodeScanInput
            value={workerScanInput}
            onChange={setWorkerScanInput}
            onSubmit={(value) => {
              handleScanWorker(value).then(() => {
                setWorkerScanInput("");
                focusStockInput();
              });
            }}
            busy={busy}
            label={t("assetReturn.workerLabel")}
            placeholder={t("assetReturn.workerPlaceholder")}
            showSubmitButton={false}
            allowProductSearch={false}
          />
        )}
      </CardContent>
    </Card>
  );

  const renderLocationScan = () => (
    <LocationScanner
      value={returnLocation}
      onChange={setReturnLocation}
      gpsEnabled
      autoDetectGpsOnMount={false}
      disabled={busy || Boolean(completedResult)}
      onScanSuccess={focusStockInput}
      title={t("assetReturn.scanLocationTitle")}
      labels={{
        detectByGps: t("assetReturn.detectByGps"),
        detectingLocation: t("assetReturn.detectingLocation"),
        gpsLocationFailed: t("assetReturn.gpsLocationFailed"),
        changeLocation: t("assetReturn.changeLocation"),
        scanLabel: t("assetReturn.toLocation"),
        scanPlaceholder: t("assetReturn.toLocationPlaceholder"),
      }}
    />
  );

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("assetReturn.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderScanInput = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetReturn.scanSectionTitle")}
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
          label={t("assetReturn.stockCodeLabel")}
          placeholder={t("assetReturn.stockCodePlaceholder")}
          submitLabel={t("assetReturn.add")}
          showSubmitButton={false}
          allowProductSearch={false}
          disabled={!returnFromStaffId || !returnLocation || busy}
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
              <TableCell>{t("assetReturn.product")}</TableCell>
              <TableCell>{t("assetReturn.stockCode")}</TableCell>
              <TableCell align="right">{t("assetReturn.returnable")}</TableCell>
              <TableCell align="right">{t("assetReturn.quantity")}</TableCell>
              <TableCell align="right">{t("assetReturn.actions")}</TableCell>
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
                <TableCell>{item.stockCode || item.stockId}</TableCell>
                <TableCell align="right">{item.returnable ?? 0}</TableCell>
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
                      max: item.returnable ?? undefined,
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
      <DialogTitle>{t("assetReturn.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("assetReturn.chooseProductBody", {
            stockCode:
              pendingProductChoice?.stockCode ||
              pendingProductChoice?.stockId ||
              "",
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
                secondary={`${t("assetReturn.stockCode")}: ${option.stockCode || "-"}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelProductChoice} disabled={busy}>
          {t("assetReturn.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPhotos = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetReturn.photosTitle")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {returnPhotos.map((photo, index) => (
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
                alt={t("assetReturn.photoAlt", { index: index + 1 })}
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
                    handleRemoveReturnPhoto(index);
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
                t("assetReturn.addPhoto")
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
          {returnPhotos[viewerIndex] && (
            <img
              src={returnPhotos[viewerIndex].localUrl}
              alt={t("assetReturn.photoAlt", { index: viewerIndex + 1 })}
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
          label={t("assetReturn.summaryItems", { count: totalItems })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("assetReturn.summaryQuantity", { count: totalQuantity })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("assetReturn.summaryWorker", {
            name: returnFromStaffName || "-",
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
          t("assetReturn.execute")
        )}
      </Button>
      <Button variant="outlined" disabled={busy} onClick={handleReset}>
        {t("assetReturn.reset")}
      </Button>
    </Box>
  );

  return (
    <Box>
      {renderHeader()}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("assetReturn.helpTitle")}
        content={t("assetReturn.helpBody")}
      />
      {renderAlerts()}
      {renderActionBy()}
      {renderWorkerScan()}
      {returnFromStaffId && renderLocationScan()}
      {returnFromStaffId && returnLocation && renderScanInput()}
      {renderScannedTable()}
      {scannedItems.length > 0 && renderPhotos()}
      {scannedItems.length > 0 && renderSummary()}
      {renderActions()}
      {renderProductChoiceDialog()}
    </Box>
  );
}
