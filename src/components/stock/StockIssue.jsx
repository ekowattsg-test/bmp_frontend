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
  MoveUp as MoveUpIcon,
  OpenInNew as OpenInNewIcon,
  CameraAlt as CameraAltIcon,
} from "@mui/icons-material";
import { PageHeader, LocationScanner } from "../common";
import HelpDialog from "../common/HelpDialog";
import StockCodeScanInput from "./StockCodeScanInput";
import useStockIssue from "../../hooks/useStockIssue";

export default function StockIssue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hook = useStockIssue();
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
    setScannedLocation,
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
    issuePhotos,
    photoUploading,
    handleAddIssuePhoto,
    handleRemoveIssuePhoto,
  } = hook;

  const focusStockInput = () => {
    const input = scanInputRef.current?.inputRef?.current;
    if (input) input.focus();
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleAddIssuePhoto(file);
    event.target.value = "";
  };

  const renderHeader = () => {
    if (isPda) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t("stockIssue.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("stockIssue.subtitle")}
          </Typography>
        </Box>
      );
    }
    return (
      <PageHeader
        title={t("stockIssue.title")}
        subtitle={t("stockIssue.subtitle")}
        icon={MoveUpIcon}
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
              {t("stockIssue.workOrderCreated", {
                workOrderId: completedResult.workOrderId,
              })}
            </Typography>
            {completedResult.pdfResult && (
              <Typography variant="body2">
                {t("stockIssue.pdfStored", {
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
                {t("stockIssue.viewWorkOrders")}
              </Button>
              <Button size="small" variant="outlined" onClick={handleReset}>
                {t("stockIssue.issueAnother")}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
    </>
  );

  const renderLocationScan = () => (
    <LocationScanner
      value={scannedLocation}
      onChange={setScannedLocation}
      gpsEnabled
      autoDetectGpsOnMount
      disabled={busy || Boolean(completedResult)}
      onScanSuccess={focusStockInput}
      title={t("stockIssue.scanLocationTitle")}
      labels={{
        detectByGps: t("stockIssue.detectByGps"),
        detectingLocation: t("stockIssue.detectingLocation"),
        gpsLocationFailed: t("stockIssue.gpsLocationFailed"),
        changeLocation: t("stockIssue.changeLocation"),
        scanLabel: t("stockIssue.fromLocation"),
        scanPlaceholder: t("stockIssue.fromLocationPlaceholder"),
      }}
    />
  );

  const renderActionBy = () => (
    <Box sx={{ mb: 3 }}>
      <Chip
        label={t("stockIssue.actionBy", { name: actionByLabel || "-" })}
        color="info"
        variant="outlined"
      />
    </Box>
  );

  const renderRecipientScan = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("stockIssue.scanRecipientTitle")}
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
              {recipientStaffName || "-"}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearRecipient}
              disabled={busy || Boolean(completedResult)}
            >
              {t("stockIssue.changeRecipient")}
            </Button>
          </Box>
        ) : (
          <StockCodeScanInput
            value={recipientScanInput}
            onChange={setRecipientScanInput}
            onSubmit={(value) => {
              handleScanRecipient(value).then(() => {
                setRecipientScanInput("");
                focusStockInput();
              });
            }}
            busy={busy}
            label={t("stockIssue.recipientLabel")}
            placeholder={t("stockIssue.recipientPlaceholder")}
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
          {t("stockIssue.scanSectionTitle")}
        </Typography>
        <StockCodeScanInput
          ref={scanInputRef}
          value={scanInput}
          onChange={setScanInput}
          onSubmit={(value) => {
            if (!scannedLocation) {
              setErrorMsg(
                t("stockIssue.locationRequired", { stockCode: value }),
              );
              return;
            }
            if (!recipientStaffId) {
              setErrorMsg(
                t("stockIssue.recipientRequired", { stockCode: value }),
              );
              return;
            }
            handleScanSubmit(value);
            setScanInput("");
          }}
          busy={busy}
          label={t("stockIssue.stockCodeLabel")}
          placeholder={t("stockIssue.stockCodePlaceholder")}
          submitLabel={t("stockIssue.add")}
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
              <TableCell>{t("stockIssue.product")}</TableCell>
              <TableCell>{t("stockIssue.stockCode")}</TableCell>
              <TableCell align="right">{t("stockIssue.available")}</TableCell>
              <TableCell align="right">{t("stockIssue.quantity")}</TableCell>
              <TableCell align="right">{t("stockIssue.actions")}</TableCell>
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
      <DialogTitle>{t("stockIssue.chooseProduct")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("stockIssue.chooseProductBody", {
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
                secondary={`${t("stockIssue.stockCode")}: ${option.stockCode || "-"}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelProductChoice} disabled={busy}>
          {t("stockIssue.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPhotos = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {t("stockIssue.photosTitle")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {issuePhotos.map((photo, index) => (
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
                alt={t("stockIssue.photoAlt", { index: index + 1 })}
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
                    handleRemoveIssuePhoto(index);
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
                t("stockIssue.addPhoto")
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
          {issuePhotos[viewerIndex] && (
            <img
              src={issuePhotos[viewerIndex].localUrl}
              alt={t("stockIssue.photoAlt", { index: viewerIndex + 1 })}
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
          label={t("stockIssue.summaryItems", { count: totalItems })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("stockIssue.summaryQuantity", { count: totalQuantity })}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={t("stockIssue.summaryRecipient", {
            name: recipientStaffName || "-",
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
          t("stockIssue.execute")
        )}
      </Button>
      <Button variant="outlined" disabled={busy} onClick={handleReset}>
        {t("stockIssue.reset")}
      </Button>
    </Box>
  );

  return (
    <Box>
      {renderHeader()}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockIssue.helpTitle")}
        content={t("stockIssue.helpBody")}
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
