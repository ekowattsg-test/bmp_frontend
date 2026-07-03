import React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "react-i18next";

const InventoryPlanningDialog = ({
  open,
  onClose,
  target,
  error,
  tab,
  onTabChange,
  loading,
  draft,
  onDraftChange,
  onErrorChange,
  formatDate,
  getAvailableProductOptions,
  stockProductOptions,
  assetProductOptions,
  getInventoryRows,
  addPlanningProduct,
  removePlanningRow,
  getAvailableBundleOptions,
  getBundleId,
  getBundleName,
  addPlanningBundle,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" component="div">
            {t("projectPlanning.inventoryPlanning", "Inventory Planning")} -{" "}
            {target?.name ||
              target?.raw?.taskName ||
              target?.raw?.streamName ||
              "-"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            <strong>{t("projectPlanning.leftHeaderStart", "Start")}: </strong>
            {formatDate(target?.startDate)}
            {"  "}
            <strong>{t("projectPlanning.leftHeaderEnd", "End")}: </strong>
            {formatDate(target?.endDate)}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Tabs
            value={tab}
            onChange={(_, value) => onTabChange(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab
              value="stock"
              label={t("projectPlanning.stockPlanning", "Stock")}
              disabled={target?.type !== "task"}
            />
            <Tab
              value="asset"
              label={t("projectPlanning.assetPlanning", "Asset")}
              disabled={target?.type !== "stream"}
            />
            <Tab
              value="bundle"
              label={t("projectPlanning.bundlePlanning", "Bundle")}
            />
          </Tabs>

          {loading ? (
            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : tab === "stock" ? (
            target?.type !== "task" ? (
              <Alert severity="warning">
                {t(
                  "projectPlanning.stockOnlyForTask",
                  "Stock planning is only available for tasks.",
                )}
              </Alert>
            ) : (
              <Stack spacing={1.25}>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.stockWorkspaceHelp",
                    "Include stock inventory required for the entire task duration.",
                  )}
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <Autocomplete
                    options={getAvailableProductOptions(
                      "stock",
                      stockProductOptions,
                    )}
                    fullWidth
                    size="small"
                    value={
                      getAvailableProductOptions(
                        "stock",
                        stockProductOptions,
                      ).find(
                        (product) =>
                          String(product?.productId || "") ===
                          String(draft.productId || ""),
                      ) || null
                    }
                    onChange={(_, value) => {
                      const nextProductId = String(
                        value?.productId || "",
                      ).trim();
                      if (!nextProductId) {
                        onDraftChange({ productId: "" });
                        return;
                      }

                      const duplicate = getInventoryRows("stock").some(
                        (item) =>
                          String(item?.productId || "").trim() ===
                          nextProductId,
                      );
                      if (duplicate) {
                        onErrorChange(
                          t(
                            "projectPlanning.inventoryDuplicateProduct",
                            "This product has already been added.",
                          ),
                        );
                        return;
                      }

                      onErrorChange("");
                      onDraftChange({ productId: nextProductId });
                    }}
                    getOptionLabel={(option) =>
                      String(
                        option?.productName ||
                          option?.productCode ||
                          option?.productId ||
                          "",
                      ).trim()
                    }
                    isOptionEqualToValue={(option, value) =>
                      String(option?.productId || "") ===
                      String(value?.productId || "")
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("product.productName", "Product")}
                      />
                    )}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label={t("basic.quantity", "Quantity")}
                    value={draft.quantity}
                    onChange={(e) =>
                      onDraftChange({ quantity: e.target.value })
                    }
                    inputProps={{ min: 1 }}
                    sx={{ width: { xs: "100%", md: 160 } }}
                  />
                  <Button
                    variant="contained"
                    disabled={!String(draft.productId || "").trim()}
                    onClick={() =>
                      addPlanningProduct(
                        "stock",
                        getAvailableProductOptions(
                          "stock",
                          stockProductOptions,
                        ),
                      )
                    }
                  >
                    {t("basic.add", "Add")}
                  </Button>
                </Stack>
                {getInventoryRows("stock").length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("projectPlanning.noStockSelected", "No stock selected.")}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        bgcolor: "background.default",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" fontWeight={700}>
                        {t("product.productName", "Product")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("product.productCode", "Code")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("basic.quantity", "Quantity")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("basic.remove", "Remove")}
                      </Typography>
                    </Box>
                    {getInventoryRows("stock").map((item) => (
                      <Box
                        key={String(item.productId)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
                          gap: 1,
                          px: 1.25,
                          py: 0.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          alignItems: "center",
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <Typography variant="body2" noWrap>
                          {item.productName}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {item.productCode || item.productId}
                        </Typography>
                        <Typography variant="body2">{item.quantity}</Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            removePlanningRow(
                              "stock",
                              "productId",
                              item.productId,
                            )
                          }
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Stack>
            )
          ) : tab === "asset" ? (
            target?.type !== "stream" ? (
              <Alert severity="warning">
                {t(
                  "projectPlanning.assetOnlyForStream",
                  "Asset planning is only available for streams.",
                )}
              </Alert>
            ) : (
              <Stack spacing={1.25}>
                <Typography variant="body2">
                  {t(
                    "projectPlanning.assetWorkspaceHelp",
                    "Include asset requirements for the entire stream duration.",
                  )}
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <Autocomplete
                    options={getAvailableProductOptions(
                      "asset",
                      assetProductOptions,
                    )}
                    fullWidth
                    size="small"
                    value={
                      getAvailableProductOptions(
                        "asset",
                        assetProductOptions,
                      ).find(
                        (product) =>
                          String(product?.productId || "") ===
                          String(draft.productId || ""),
                      ) || null
                    }
                    onChange={(_, value) => {
                      const nextProductId = String(
                        value?.productId || "",
                      ).trim();
                      if (!nextProductId) {
                        onDraftChange({ productId: "" });
                        return;
                      }

                      const duplicate = getInventoryRows("asset").some(
                        (item) =>
                          String(item?.productId || "").trim() ===
                          nextProductId,
                      );
                      if (duplicate) {
                        onErrorChange(
                          t(
                            "projectPlanning.inventoryDuplicateProduct",
                            "This product has already been added.",
                          ),
                        );
                        return;
                      }

                      onErrorChange("");
                      onDraftChange({ productId: nextProductId });
                    }}
                    getOptionLabel={(option) =>
                      String(
                        option?.productName ||
                          option?.productCode ||
                          option?.productId ||
                          "",
                      ).trim()
                    }
                    isOptionEqualToValue={(option, value) =>
                      String(option?.productId || "") ===
                      String(value?.productId || "")
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("product.productName", "Product")}
                      />
                    )}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label={t("basic.quantity", "Quantity")}
                    value={draft.quantity}
                    onChange={(e) =>
                      onDraftChange({ quantity: e.target.value })
                    }
                    inputProps={{ min: 1 }}
                    sx={{ width: { xs: "100%", md: 160 } }}
                  />
                  <Button
                    variant="contained"
                    disabled={!String(draft.productId || "").trim()}
                    onClick={() =>
                      addPlanningProduct(
                        "asset",
                        getAvailableProductOptions(
                          "asset",
                          assetProductOptions,
                        ),
                      )
                    }
                  >
                    {t("basic.add", "Add")}
                  </Button>
                </Stack>
                {getInventoryRows("asset").length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("projectPlanning.noAssetSelected", "No asset selected.")}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        bgcolor: "background.default",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" fontWeight={700}>
                        {t("product.productName", "Product")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("product.productCode", "Code")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("basic.quantity", "Quantity")}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>
                        {t("basic.remove", "Remove")}
                      </Typography>
                    </Box>
                    {getInventoryRows("asset").map((item) => (
                      <Box
                        key={String(item.productId)}
                        sx={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(0, 1.6fr) minmax(0, 1fr) 90px 56px",
                          gap: 1,
                          px: 1.25,
                          py: 0.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          alignItems: "center",
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <Typography variant="body2" noWrap>
                          {item.productName}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {item.productCode || item.productId}
                        </Typography>
                        <Typography variant="body2">{item.quantity}</Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            removePlanningRow(
                              "asset",
                              "productId",
                              item.productId,
                            )
                          }
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Stack>
            )
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="body2">
                {t(
                  "projectPlanning.bundleWorkspaceHelp",
                  "Include fixed bundles required for the entire stream/task duration.",
                )}
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Autocomplete
                  options={getAvailableBundleOptions()}
                  fullWidth
                  size="small"
                  value={
                    getAvailableBundleOptions().find(
                      (bundle) =>
                        getBundleId(bundle) === String(draft.bundleId || ""),
                    ) || null
                  }
                  onChange={(_, value) => {
                    const nextBundleId = getBundleId(value);
                    if (!nextBundleId) {
                      onDraftChange({ bundleId: "" });
                      return;
                    }

                    const duplicate = getInventoryRows("bundle").some(
                      (item) =>
                        String(item?.bundleId || "").trim() === nextBundleId,
                    );
                    if (duplicate) {
                      onErrorChange(
                        t(
                          "projectPlanning.inventoryDuplicateBundle",
                          "This bundle has already been added.",
                        ),
                      );
                      return;
                    }

                    onErrorChange("");
                    onDraftChange({ bundleId: nextBundleId });
                  }}
                  getOptionLabel={(option) => getBundleName(option)}
                  isOptionEqualToValue={(option, value) =>
                    getBundleId(option) === getBundleId(value)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("productBundle.title", "Bundle")}
                    />
                  )}
                />
                <TextField
                  type="number"
                  size="small"
                  label={t("basic.quantity", "Quantity")}
                  value={draft.bundleQuantity}
                  onChange={(e) =>
                    onDraftChange({ bundleQuantity: e.target.value })
                  }
                  inputProps={{ min: 1 }}
                  sx={{ width: { xs: "100%", md: 160 } }}
                />
                <Button
                  variant="contained"
                  disabled={!String(draft.bundleId || "").trim()}
                  onClick={addPlanningBundle}
                >
                  {t("basic.add", "Add")}
                </Button>
              </Stack>
              {getInventoryRows("bundle").length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("projectPlanning.noBundleSelected", "No bundle selected.")}
                </Typography>
              ) : (
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1.2fr) minmax(0, 1.8fr) 90px 56px",
                      gap: 1,
                      px: 1.25,
                      py: 0.75,
                      bgcolor: "background.default",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      {t("productBundle.title", "Bundle")}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {t("productBundle.members", "Members")}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {t("basic.quantity", "Quantity")}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {t("basic.remove", "Remove")}
                    </Typography>
                  </Box>
                  {getInventoryRows("bundle").map((item) => (
                    <Box
                      key={String(item.bundleId)}
                      sx={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1.2fr) minmax(0, 1.8fr) 90px 56px",
                        gap: 1,
                        px: 1.25,
                        py: 0.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        alignItems: "center",
                        "&:last-child": { borderBottom: "none" },
                      }}
                    >
                      <Typography variant="body2" noWrap>
                        {item.bundleName}
                      </Typography>
                      <Box sx={{ minWidth: 0 }}>
                        {String(item.bundleMembersText || "").trim() ? (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {String(item.bundleMembersText || "")
                              .split(",")
                              .map((name) => name.trim())
                              .filter(Boolean)
                              .map((name, idx) => (
                                <Chip
                                  key={`${item.bundleId}-${idx}`}
                                  label={name}
                                  size="small"
                                />
                              ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body2">{item.quantity}</Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          removePlanningRow("bundle", "bundleId", item.bundleId)
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("basic.close", "Close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryPlanningDialog;
