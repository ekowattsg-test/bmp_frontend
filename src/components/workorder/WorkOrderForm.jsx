import React, { useState, useEffect, useContext } from "react";
import { Box, Button, TextField, MenuItem } from "@mui/material";
import {
  ListAlt as ListAltIcon,
  FormatListNumbered as StepsIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { toLocalISO } from "../../helpers/date_helper";
import { AuthContext } from "../../context/authContext";
import { HeaderBar } from "../common";
import WorkOrderDataForm from "./WorkOrderDataForm";
import WorkOrderStepsForm from "./WorkOrderStepsForm";

/**
 * WorkOrderForm — shared Add / Edit form.
 *
 * Props:
 *   mode           "add" | "edit" | "view"
 *   workOrderType  string  — pre-selected type (from the type picker on add)
 *   workOrder      object | null — existing record when mode === "edit" or "view"
 *   onClose(saved) callback — called with true if a save occurred, false on cancel
 */
const WorkOrderForm = ({ mode, workOrderType, workOrder, onClose }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);

  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [workOrderTypes, setWorkOrderTypes] = useState([]);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    request("GET", "/api/workordertypes")
      .then((res) =>
        setWorkOrderTypes((res.data || []).filter((wt) => wt.active === 1)),
      )
      .catch(() => setWorkOrderTypes([]));
    request("GET", "/api/staffs")
      .then((res) =>
        setStaffList((res.data || []).filter((s) => s.active === 1)),
      )
      .catch(() => setStaffList([]));
  }, []);

  const [form, setForm] = useState({
    workOrderType: workOrder?.workOrderType ?? workOrderType ?? "",
    workDescription: workOrder?.workDescription ?? "",
    issuedBy:
      workOrder?.issuedBy ??
      `${userInfo?.lastName ?? ""} ${userInfo?.firstName ?? ""}`.trim() ??
      "",
    workOrderDate: workOrder?.workOrderDate
      ? workOrder.workOrderDate.slice(0, 16) // "YYYY-MM-DDTHH:mm"
      : toLocalISO().slice(0, 16),
    workBy: workOrder?.workBy ?? "",
    workOrderStatus: workOrder?.workOrderStatus ?? "OPEN",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDataForm, setShowDataForm] = useState(false);
  const [showStepsForm, setShowStepsForm] = useState(false);

  const currentType = workOrderTypes.find(
    (wt) => wt.workOrderType === form.workOrderType,
  );
  const needDetails = currentType?.needDetails === 1;
  const needSteps = (currentType?.numberOfSteps || 0) > 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.workOrderType.trim())
      errs.workOrderType = t("workOrder.required", "Required");
    if (!form.workDescription.trim())
      errs.workDescription = t("workOrder.required", "Required");
    if (!form.workOrderDate)
      errs.workOrderDate = t("workOrder.required", "Required");
    if (!form.workBy) errs.workBy = t("workOrder.required", "Required");
    if (!form.workOrderStatus)
      errs.workOrderStatus = t("workOrder.required", "Required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        workOrderType: form.workOrderType,
        workDescription: form.workDescription,
        issuedBy: form.issuedBy,
        workOrderDate: form.workOrderDate
          ? toLocalISO(new Date(form.workOrderDate))
          : null,
        workBy: form.workBy,
        workOrderStatus: form.workOrderStatus,
      };

      if (isEdit) {
        await request(
          "PUT",
          `/api/workorders/${workOrder.workOrderId}`,
          payload,
        );
      } else {
        await request("POST", "/api/workorders", payload);
      }
      onClose(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.failed"));
    } finally {
      setLoading(false);
    }
  };

  const titleKey = isView
    ? "workOrder.viewTitle"
    : isEdit
      ? "workOrder.editTitle"
      : "workOrder.addTitle";

  if (showStepsForm) {
    return (
      <WorkOrderStepsForm
        workOrder={workOrder}
        workOrderTypeObj={currentType || null}
        staffList={staffList}
        onClose={() => setShowStepsForm(false)}
      />
    );
  }

  if (showDataForm) {
    return (
      <WorkOrderDataForm
        workOrder={workOrder}
        staffList={staffList}
        onClose={() => setShowDataForm(false)}
      />
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: { xs: "100%", sm: 560 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 3 },
        borderRadius: 2,
      }}
    >
      <HeaderBar title={t(titleKey)} sx={{ mb: 1 }} />

      <TextField
        label={t("workOrder.workOrderType")}
        value={
          workOrderTypes.find((wt) => wt.workOrderType === form.workOrderType)
            ?.workOrderDescription || form.workOrderType
        }
        fullWidth
        margin="normal"
        InputProps={{ readOnly: true }}
      />

      <TextField
        label={t("workOrder.workDescription")}
        name="workDescription"
        value={form.workDescription}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        minRows={3}
        required={!isView}
        InputProps={isView ? { readOnly: true } : undefined}
        error={!!errors.workDescription}
        helperText={errors.workDescription}
      />

      <TextField
        label={t("workOrder.issuedBy")}
        value={form.issuedBy}
        fullWidth
        margin="normal"
        InputProps={{ readOnly: true }}
      />

      <TextField
        label={t("workOrder.workOrderDate")}
        name="workOrderDate"
        value={form.workOrderDate}
        onChange={handleChange}
        type="datetime-local"
        fullWidth
        margin="normal"
        required={!isView}
        InputLabelProps={{ shrink: true }}
        InputProps={isView ? { readOnly: true } : undefined}
        error={!!errors.workOrderDate}
        helperText={errors.workOrderDate}
      />

      {isView ? (
        <TextField
          label={t("workOrder.workBy")}
          value={
            staffList.find((s) => s.staffId === form.workBy)?.staffName ||
            form.workBy
          }
          fullWidth
          margin="normal"
          InputProps={{ readOnly: true }}
        />
      ) : (
        <TextField
          select
          label={t("workOrder.workBy")}
          name="workBy"
          value={form.workBy}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!errors.workBy}
          helperText={errors.workBy}
        >
          {staffList.map((s) => (
            <MenuItem key={s.staffId} value={s.staffId}>
              {s.staffName}
            </MenuItem>
          ))}
        </TextField>
      )}

      <TextField
        label={t("workOrder.workOrderStatus")}
        name="workOrderStatus"
        value={form.workOrderStatus}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputProps={isView ? { readOnly: true } : undefined}
        error={!!errors.workOrderStatus}
        helperText={errors.workOrderStatus}
      />

      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        {!isView && (
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {t("basic.save")}
          </Button>
        )}
        {isEdit && needDetails && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ListAltIcon />}
            onClick={() => setShowDataForm(true)}
            disabled={loading}
          >
            {t("workOrderData.details", "Details")}
          </Button>
        )}
        {isEdit && needSteps && (
          <Button
            variant="outlined"
            color="info"
            startIcon={<StepsIcon />}
            onClick={() => setShowStepsForm(true)}
            disabled={loading}
          >
            {t("workOrderSteps.steps", "Steps")}
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => onClose(false)}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
    </Box>
  );
};

export default WorkOrderForm;
