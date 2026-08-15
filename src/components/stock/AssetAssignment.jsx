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
import { PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useAssetAssignment from "../../hooks/useAssetAssignment";

export default function AssetAssignment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useAssetAssignment();
  const [locationScanInput, setLocationScanInput] = React.useState("");
  const [recipientScanInput, setRecipientScanInput] = React.useState("");
  const [scanInput, setScanInput] = React.useState("");
  const scanInputRef = React.useRef(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  const {
    isPda,
    userInfo,
    helpOpen,
    setHelpOpen,
    scannedLocation,
    locationGpsBusy,
    locationGpsFailed,
    handleAutoDetectLocation,
    handleScanLocation,
    handleClearLocation,
    operatorName,
    actionByLabel,
    recipientStaffId,
    recipientStaffName,
    handleScanRecipient,
    handleClearRecipient,
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
    assignmentPhotos,
    photoUploading,
    handleAddAssignmentPhoto,
    handleRemoveAssignmentPhoto,
  } = hook;

  const focusAssetInput = () => {
    const input = scanInputRef.current?.inputRef?.current;
    if (input) input.focus();
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleAddAssignmentPhoto(file);
    event.target.value = "";
  };

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("assetAssignment.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("assetAssignment.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("assetAssignment.title")}
        subtitle={t("assetAssignment.subtitle")}
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
              {t("assetAssignment.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("assetAssignment.pdfStored", {
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
                {t("assetAssignment.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("assetAssignment.assignAnother")}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
    </>
  );

  const renderLocationScan = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetAssignment.scanLocationTitle")}
        </Typography>
        {scannedLocation ? (
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
              {scannedLocation}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearLocation}
              disabled={busy || Boolean(completedResult)}
            >
              {t("assetAssignment.changeLocation")}
            </Button>
          </Box>
        ) : locationGpsBusy ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {t("assetAssignment.detectingLocation")}
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
              {t("assetAssignment.detectByGps")}
            </Button>
            {locationGpsFailed && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                {t("assetAssignment.gpsLocationFailed")}
              </Alert>
            )}
            <StockCodeScanInput
              value={locationScanInput}
              onChange={setLocationScanInput}
              onSubmit={(value) => {
                handleScanLocation(value).then(() => {
                  setLocationScanInput("");
                  focusAssetInput();
                });
              }}
              busy={busy}
              label={t("assetAssignment.fromLocation")}
              placeholder={t("assetAssignment.fromLocationPlaceholder")}
              showSubmitButton={false}
              allowProductSearch={false}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("assetAssignment.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderRecipientScan = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetAssignment.scanRecipientTitle")}
        </Typography>
        {recipientStaffId ? (
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
              {recipientStaffName || recipientStaffId}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearRecipient}
              disabled={busy || Boolean(completedResult)}
            >
              {t("assetAssignment.changeRecipient")}
            </Button>
          </Box>
        ) : (
          <StockCodeScanInput
            value={recipientScanInput}
            onChange={setRecipientScanInput}
            onSubmit={(value) => {
              handleScanRecipient(value).then(() => {
                setRecipientScanInput("");
                focusAssetInput();
              });
            }}
            busy={busy}
            label={t("assetAssignment.recipientLabel")}
            placeholder={t("assetAssignment.recipientPlaceholder")}
            showSubmitButton={false}
            allowProductSearch={false}
          />
        )}
      </CardContent>
    </Card>
  );

  const renderScanInput = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetAssignment.scanSectionTitle")}
        </Typography>
        <StockCodeScanInput
          ref={scanInputRef}
          value={scanInput}
          onChange={setScanInput}
          onSubmit={(value) => {
            if (!scannedLocation) {
              setErrorMsg(
                t("assetAssignment.locationRequired", { stockCode: value }),
              );
              return;
            }
            if (!recipientStaffId) {
              setErrorMsg(
                t("assetAssignment.recipientRequired", { stockCode: value }),
              );
              return;
            }
            handleScanSubmit(value);
            setScanInput("");
          }}
          busy={busy}
          label={t("assetAssignment.assetCodeLabel")}
          placeholder={t("assetAssignment.assetCodePlaceholder")}
          submitLabel={t("assetAssignment.add")}
          showSubmitButton={false}
          allowProductSearch={false}
          disabled={!scannedLocation || !recipientStaffId || busy}
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
              <TableCell>{t("assetAssignment.product")}</TableCell>
              <TableCell>{t("assetAssignment.assetCode")}</TableCell>
              <TableCell>{t("assetAssignment.quantity")}</TableCell>
              <TableCell>{t("assetAssignment.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scannedItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  {productMap[item.productCode] || item.productCode || "-"}
                </TableCell>
                <TableCell>{item.stockId}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={item.subQuantity}
                    onChange={(e) =>
                      handleUpdateScan(index, "subQuantity", e.target.value)
                    }
                    inputProps={{ min: 1, max: item.available }}
                    disabled={busy || Boolean(completedResult)}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="error"
                    size="small"
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
      <DialogTitle>{t("assetAssignment.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("assetAssignment.chooseProductBody", {
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
          {t("assetAssignment.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPhotos = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("assetAssignment.photosTitle")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {assignmentPhotos.map((photo, index) => (
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
                alt={t("assetAssignment.photoAlt", { index: index + 1 })}
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
                    handleRemoveAssignmentPhoto(index);
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
                t("assetAssignment.addPhoto")
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
          {assignmentPhotos[viewerIndex] && (
            <img
              src={assignmentPhotos[viewerIndex].localUrl}
              alt={t("assetAssignment.photoAlt", {
                index: viewerIndex + 1,
              })}
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
          label={t("assetAssignment.summaryItems", { count: totalItems })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("assetAssignment.summaryQuantity", { count: totalQuantity })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("assetAssignment.summaryRecipient", {
            name: recipientStaffName || recipientStaffId || "-",
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
          t("assetAssignment.execute")
        )}
      </Button>
      <Button variant="outlined" disabled={busy} onClick={handleReset}>
        {t("assetAssignment.reset")}
      </Button>
    </Box>
  );

  return (
    <Box>
      {renderHeader()}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("assetAssignment.helpTitle")}
        content={t("assetAssignment.helpBody")}
      />
      {renderAlerts()}
      {!completedResult && (
        <>
          {renderActionBy()}
          {renderLocationScan()}
          {renderRecipientScan()}
          {renderScanInput()}
          {renderScannedTable()}
          {scannedItems.length > 0 && renderSummary()}
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
          {renderPhotos()}
          {renderActions()}
        </>
      )}
      {renderProductChoiceDialog()}
    </Box>
  );
}
