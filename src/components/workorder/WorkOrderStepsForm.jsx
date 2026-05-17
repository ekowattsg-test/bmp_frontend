import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  MenuItem,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

/**
 * Smart input cell for a step's from/to location.
 * Renders different UI based on the workorderentity type code.
 *
 * entityType: "PO" | "location" | "vehicle" | "worker" | "" (plain text)
 */
const EntityInput = ({
  entityType,
  value,
  onChange,
  workerValue,
  lookups,
  staffList,
}) => {
  const { t } = useTranslation();

  if (entityType === "worker") {
    const displayName =
      (staffList || []).find((s) => String(s.staffId) === String(value))
        ?.staffName ||
      workerValue ||
      value ||
      "";
    return (
      <TextField
        size="small"
        value={displayName}
        variant="standard"
        InputProps={{ readOnly: true, disableUnderline: true }}
        sx={{ minWidth: 120, "& input": { cursor: "default" } }}
        title={t(
          "workOrderSteps.entityWorkerHint",
          "Auto-filled from work order",
        )}
      />
    );
  }

  if (entityType === "PO") {
    return (
      <TextField
        select
        size="small"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        variant="standard"
        label={t("workOrderSteps.placeholder.po", "Select PO")}
        sx={{ minWidth: 140 }}
        SelectProps={{ displayEmpty: true }}
      >
        <MenuItem value="">—</MenuItem>
        {(lookups.pos || []).map((po) => (
          <MenuItem key={po.orderId} value={String(po.orderId)}>
            {po.orderId}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (entityType === "vehicle") {
    return (
      <TextField
        select
        size="small"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        variant="standard"
        label={t("workOrderSteps.placeholder.vehicle", "Select Vehicle")}
        sx={{ minWidth: 120 }}
        SelectProps={{ displayEmpty: true }}
      >
        <MenuItem value="">—</MenuItem>
        {(lookups.vehicles || []).map((v) => (
          <MenuItem key={v.vehicleNumber} value={v.vehicleNumber}>
            {v.vehicleNumber}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (entityType === "location") {
    return (
      <Autocomplete
        freeSolo
        size="small"
        options={lookups.locations || []}
        value={value || ""}
        onInputChange={(_, newVal) => onChange(newVal)}
        onChange={(_, newVal) => onChange(newVal || "")}
        sx={{ minWidth: 140 }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            placeholder={t("workOrderSteps.placeholder.location", "Location")}
          />
        )}
      />
    );
  }

  // Default — plain text (entity type unknown or empty)
  return (
    <TextField
      size="small"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      variant="standard"
      sx={{ minWidth: 100 }}
    />
  );
};

/**
 * WorkOrderStepsForm — view and edit pre-created work steps.
 *
 * On first open: auto-creates steps from /api/workstepstypes templates
 * (falling back to numberOfSteps empty rows if no templates exist).
 * User edits fromLocation, toLocation, stepStatus inline and saves.
 *
 * Props:
 *   workOrder        object — { workOrderId, workOrderType, workBy, ... }
 *   workOrderTypeObj object — { numberOfSteps, ... } from workordertypes
 *   staffList        array  — pre-loaded staff list (for resolving worker name)
 *   onClose()        callback
 */
const WorkOrderStepsForm = ({
  workOrder,
  workOrderTypeObj,
  staffList = [],
  onClose,
}) => {
  const { t } = useTranslation();

  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mismatchDialog, setMismatchDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Lookup data for entity inputs
  const [lookups, setLookups] = useState({
    pos: [],
    vehicles: [],
    locations: [],
    allStaff: [],
  });

  // Resolve the worker display value from staffList (or fall back to raw workBy id)
  const workerValue =
    staffList.find((s) => s.staffId === workOrder.workBy)?.staffName ||
    workOrder.workBy ||
    "";

  // Fetch PO, vehicle, location and staff lookups once on mount
  useEffect(() => {
    const fetchLookups = async () => {
      const [posRes, vehiclesRes, stockviewsRes, staffRes] =
        await Promise.allSettled([
          request("GET", "/api/purchaseOrders"),
          request("GET", "/api/vehicles"),
          request("GET", "/api/stockviews"),
          request("GET", "/api/staffs"),
        ]);

      const allPOs =
        posRes.status === "fulfilled" ? posRes.value.data || [] : [];
      const readyPOs = allPOs.filter(
        (po) => (po.orderStatus || "").toUpperCase() === "READY",
      );

      const allVehicles =
        vehiclesRes.status === "fulfilled" ? vehiclesRes.value.data || [] : [];
      const activeVehicles = allVehicles.filter(
        (v) => v.active === 1 || v.active === true,
      );

      const stockviews =
        stockviewsRes.status === "fulfilled"
          ? stockviewsRes.value.data || []
          : [];
      const locSet = new Set();
      stockviews.forEach((sv) => {
        if (sv.location) locSet.add(sv.location);
      });

      const allStaff =
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [];

      setLookups({
        pos: readyPOs,
        vehicles: activeVehicles,
        locations: Array.from(locSet).sort(),
        allStaff,
      });
    };
    fetchLookups();
  }, []);

  const initSteps = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Load existing steps for this work order
      const existingRes = await request(
        "GET",
        `/api/worksteps/order/${workOrder.workOrderId}`,
      );
      const existing = (existingRes.data || []).filter(
        (s) => String(s.workOrderId) === String(workOrder.workOrderId),
      );

      if (existing.length > 0) {
        // Fetch templates to populate description and entity types
        const typesRes = await request("GET", "/api/workstepstypes");
        const templates = (typesRes.data || []).filter(
          (wst) => wst.workOrderType === workOrder.workOrderType,
        );
        setSteps(
          existing
            .sort((a, b) => a.stepNumber - b.stepNumber)
            .map((s) => {
              const tmpl = templates.find(
                (tmpl) => tmpl.stepNumber === s.stepNumber,
              );
              // Always sync worker entity fields to current workOrder.workBy
              let fromLoc = s.fromLocation;
              let toLoc = s.toLocation;
              if (tmpl?.fromEntity === "worker")
                fromLoc = workOrder.workBy || "";
              if (tmpl?.toEntity === "worker") toLoc = workOrder.workBy || "";
              return {
                ...s,
                fromLocation: fromLoc,
                toLocation: toLoc,
                _dirty: false,
                _description: tmpl?.stepDescription || "",
                _fromEntity: tmpl?.fromEntity || "",
                _toEntity: tmpl?.toEntity || "",
              };
            }),
        );
        return;
      }

      // No steps yet — auto-create from templates
      const typesRes = await request("GET", "/api/workstepstypes");
      const templates = (typesRes.data || []).filter(
        (wst) => wst.workOrderType === workOrder.workOrderType,
      );

      const numberOfSteps = workOrderTypeObj?.numberOfSteps || 0;
      const count = Math.min(
        templates.length > 0 ? templates.length : numberOfSteps,
        numberOfSteps,
      );

      if (count === 0) {
        setSteps([]);
        return;
      }

      // Build payloads — pre-fill worker entity from workOrder.workBy
      const created = await Promise.all(
        Array.from({ length: count }, (_, i) => {
          const tmpl =
            templates.find((t) => t.stepNumber === i + 1) || templates[i];
          const fromLoc =
            tmpl?.fromEntity === "worker" ? workOrder.workBy || "" : "";
          const toLoc =
            tmpl?.toEntity === "worker" ? workOrder.workBy || "" : "";
          const payload = {
            workOrderId: workOrder.workOrderId,
            stepNumber: i + 1,
            fromLocation: fromLoc,
            toLocation: toLoc,
            stepStatus: "OPEN",
          };
          return request("POST", "/api/worksteps", payload).then((r) => r.data);
        }),
      );

      setSteps(
        created.map((s) => {
          const tmpl = templates.find((t) => t.stepNumber === s.stepNumber);
          return {
            ...s,
            _dirty: false,
            _description: tmpl?.stepDescription || "",
            _fromEntity: tmpl?.fromEntity || "",
            _toEntity: tmpl?.toEntity || "",
          };
        }),
      );
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    } finally {
      setLoading(false);
    }
  }, [
    workOrder.workOrderId,
    workOrder.workOrderType,
    workOrder.workBy,
    workOrderTypeObj,
    t,
  ]);

  useEffect(() => {
    initSteps();
  }, [initSteps]);

  const handleCellChange = (workStepsId, field, value) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.workStepsId === workStepsId
          ? { ...s, [field]: value, _dirty: true }
          : s,
      ),
    );
    setSuccessMsg("");
  };

  /**
   * Entity-aware change handler.
   * - vehicle: syncs all vehicle entity fields across all steps to the same value,
   *            then checks if the vehicle's driver differs from workOrder.workBy.
   * - worker:  checks if the selected worker differs from workOrder.workBy.
   * Both mismatches show a confirmation dialog before applying.
   */
  const handleEntityChange = (workStepsId, field, entityType, value) => {
    setSuccessMsg("");

    if (entityType === "vehicle") {
      // Sync ALL vehicle entity fields across all steps to the same value
      const applyVehicleChange = () => {
        setSteps((prev) =>
          prev.map((s) => {
            const updates = {};
            if (s._fromEntity === "vehicle") updates.fromLocation = value;
            if (s._toEntity === "vehicle") updates.toLocation = value;
            if (!Object.keys(updates).length) return s;
            return { ...s, ...updates, _dirty: true };
          }),
        );
      };

      const vehicle = lookups.vehicles.find((v) => v.vehicleNumber === value);
      const driverId = vehicle?.driver;
      const assignedId = workOrder.workBy;

      if (
        value &&
        driverId != null &&
        driverId !== "" &&
        String(driverId) !== String(assignedId)
      ) {
        const driverName =
          lookups.allStaff.find((s) => String(s.staffId) === String(driverId))
            ?.staffName ||
          staffList.find((s) => String(s.staffId) === String(driverId))
            ?.staffName ||
          String(driverId);
        const assignedName =
          lookups.allStaff.find((s) => String(s.staffId) === String(assignedId))
            ?.staffName ||
          staffList.find((s) => String(s.staffId) === String(assignedId))
            ?.staffName ||
          String(assignedId || "");
        setMismatchDialog({
          open: true,
          title: t(
            "workOrderSteps.mismatch.vehicleDriverTitle",
            "Vehicle-Staff Mismatch",
          ),
          message: t("workOrderSteps.mismatch.vehicleDriver", {
            driver: driverName,
            staff: assignedName,
            defaultValue: `Vehicle driver (${driverName}) differs from assigned staff (${assignedName}). Proceed anyway?`,
          }),
          onConfirm: () => {
            applyVehicleChange();
            setMismatchDialog((d) => ({ ...d, open: false }));
          },
        });
        return;
      }

      applyVehicleChange();
      return;
    }

    if (entityType === "worker") {
      const assignedId = workOrder.workBy;
      if (value && String(value) !== String(assignedId)) {
        const workerName =
          lookups.allStaff.find((s) => String(s.staffId) === String(value))
            ?.staffName ||
          staffList.find((s) => String(s.staffId) === String(value))
            ?.staffName ||
          String(value);
        const assignedName =
          lookups.allStaff.find((s) => String(s.staffId) === String(assignedId))
            ?.staffName ||
          staffList.find((s) => String(s.staffId) === String(assignedId))
            ?.staffName ||
          String(assignedId || "");
        setMismatchDialog({
          open: true,
          title: t(
            "workOrderSteps.mismatch.workerTitle",
            "Worker-Staff Mismatch",
          ),
          message: t("workOrderSteps.mismatch.worker", {
            worker: workerName,
            staff: assignedName,
            defaultValue: `Selected worker (${workerName}) differs from assigned staff (${assignedName}). Proceed anyway?`,
          }),
          onConfirm: () => {
            handleCellChange(workStepsId, field, value);
            setMismatchDialog((d) => ({ ...d, open: false }));
          },
        });
        return;
      }
      handleCellChange(workStepsId, field, value);
      return;
    }

    handleCellChange(workStepsId, field, value);
  };

  const handleSave = async () => {
    // Validate all entity fields are filled
    const unfilled = steps.filter((s) => {
      const fromEmpty =
        s._fromEntity && s._fromEntity !== "worker" && !s.fromLocation;
      const toEmpty = s._toEntity && s._toEntity !== "worker" && !s.toLocation;
      return fromEmpty || toEmpty;
    });
    if (unfilled.length > 0) {
      const stepNums = unfilled.map((s) => s.stepNumber).join(", ");
      setErrorMsg(
        t("workOrderSteps.validation.allEntitiesRequired", {
          steps: stepNums,
          defaultValue: `Step ${stepNums}: all fields must be filled before saving.`,
        }),
      );
      return;
    }

    const dirty = steps.filter((s) => s._dirty);
    if (dirty.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await Promise.all(
        dirty.map((s) =>
          request("PUT", `/api/worksteps/${s.workStepsId}`, {
            workOrderId: s.workOrderId,
            stepNumber: s.stepNumber,
            fromLocation:
              s._fromEntity === "worker"
                ? workOrder.workBy || ""
                : s.fromLocation,
            toLocation:
              s._toEntity === "worker" ? workOrder.workBy || "" : s.toLocation,
            stepStatus: s.stepStatus,
          }),
        ),
      );
      setSteps((prev) => prev.map((s) => ({ ...s, _dirty: false })));
      setSuccessMsg(t("workOrderSteps.saved", "Steps saved successfully."));
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 800 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar
        title={t("workOrderSteps.title", "Work Order Steps")}
        subtitle={`${t("workOrder.workOrderId")}: ${workOrder.workOrderId}`}
        showBackButton
        onBack={onClose}
        backLabel={t("basic.back", "Back")}
        sx={{ mb: 2 }}
      />

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t("workOrderSteps.loading", "Loading steps...")}
          </Typography>
        </Box>
      ) : steps.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t(
            "workOrderSteps.noItems",
            "No steps configured for this work order type.",
          )}
        </Typography>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ border: "1px solid var(--color-gray-200)", mb: 3 }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                <TableCell sx={{ width: 60 }}>
                  {t("workOrderSteps.stepNumber", "Step #")}
                </TableCell>
                <TableCell>
                  {t("workOrderSteps.description", "Description")}
                </TableCell>
                <TableCell>
                  {t("workOrderSteps.fromLocation", "From")}
                </TableCell>
                <TableCell>{t("workOrderSteps.toLocation", "To")}</TableCell>
                <TableCell>
                  {t("workOrderSteps.stepStatus", "Status")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {steps.map((step) => (
                <TableRow
                  key={step.workStepsId}
                  sx={{
                    "&:hover": { bgcolor: "action.hover" },
                    ...(step._dirty ? { bgcolor: "action.selected" } : {}),
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>
                    {step.stepNumber}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary", minWidth: 120 }}>
                    {step._description || "—"}
                  </TableCell>
                  <TableCell>
                    <EntityInput
                      entityType={step._fromEntity}
                      value={step.fromLocation}
                      onChange={(val) =>
                        handleEntityChange(
                          step.workStepsId,
                          "fromLocation",
                          step._fromEntity,
                          val,
                        )
                      }
                      workerValue={workerValue}
                      lookups={lookups}
                      staffList={staffList}
                    />
                  </TableCell>
                  <TableCell>
                    <EntityInput
                      entityType={step._toEntity}
                      value={step.toLocation}
                      onChange={(val) =>
                        handleEntityChange(
                          step.workStepsId,
                          "toLocation",
                          step._toEntity,
                          val,
                        )
                      }
                      workerValue={workerValue}
                      lookups={lookups}
                      staffList={staffList}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {step.stepStatus || "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ color: "var(--color-success)", marginBottom: 8 }}>
          {successMsg}
        </div>
      )}

      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        {steps.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || loading}
          >
            {t("basic.save", "Save")}
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onClose}
          disabled={saving}
        >
          {t("basic.back", "Back")}
        </Button>
      </Box>

      {/* Mismatch confirmation dialog */}
      <Dialog
        open={mismatchDialog.open}
        onClose={() => setMismatchDialog((d) => ({ ...d, open: false }))}
      >
        <DialogTitle>{mismatchDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{mismatchDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setMismatchDialog((d) => ({ ...d, open: false }))}
          >
            {t("basic.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={mismatchDialog.onConfirm}
          >
            {t("workOrderSteps.mismatch.proceed", "Proceed")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrderStepsForm;
