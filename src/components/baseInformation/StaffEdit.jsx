import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";

const formatDateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const StaffEdit = ({ staff, onCancel }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);
  const userCompanyId = userInfo?.companyId || "";
  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";

  const [form, setForm] = useState({
    staffName: staff.staffName || "",
    staffId: staff.staffId || "",
    mobileNumber: staff.mobileNumber || "",
    staffRoleCode: staff.staffRoleCode ?? "",
    serviceStartDate: staff.serviceStartDate || "",
    serviceEndDate: staff.serviceEndDate || "",
    department: staff.department || "",
    staffNumber: staff.staffNumber || "",
    companyId: staff.companyId || userCompanyId,
    active: staff.active ?? 1,
  });
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptDialogJustClosed, setDeptDialogJustClosed] = useState(false);
  const [deptOptions, setDeptOptions] = useState([]);
  const [deptSearch, setDeptSearch] = useState("");
  const [newDept, setNewDept] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogJustClosed, setRoleDialogJustClosed] = useState(false);
  const [roleCodes, setRoleCodes] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    setForm({
      staffName: staff.staffName || "",
      staffId: staff.staffId || "",
      mobileNumber: staff.mobileNumber || "",
      staffRoleCode: staff.staffRoleCode ?? "",
      serviceStartDate: staff.serviceStartDate || "",
      serviceEndDate: staff.serviceEndDate || "",
      department: staff.department || "",
      staffNumber: staff.staffNumber || "",
      companyId: staff.companyId || userCompanyId,
      active: staff.active ?? 1,
    });
  }, [staff, userCompanyId]);

  useEffect(() => {
    Promise.all([
      request("GET", "/api/roles"),
      request("GET", "/api/companies"),
    ])
      .then(([rolesResponse, companiesResponse]) => {
        setRoles(rolesResponse.data || []);
        const allCompanies = companiesResponse.data || [];
        setCompanies(allCompanies);
        // Filter companies: active is true and showCompany is true
        const filtered = allCompanies.filter(
          (company) =>
            (company.active === true || company.active === 1) &&
            company.showCompany === true,
        );
        setFilteredCompanies(filtered);
      })
      .catch(() => {
        setRoles([]);
        setCompanies([]);
        setFilteredCompanies([]);
      });
  }, []);

  useEffect(() => {
    if (!form.companyId) {
      setDeptOptions([]);
      return;
    }

    request("GET", "/api/staffs")
      .then((response) => {
        const staffList = response?.data || [];
        const companyKey = String(form.companyId ?? "");
        const uniqueDepartments = new Set();

        staffList.forEach((staffItem) => {
          const staffCompanyKey = String(staffItem?.companyId ?? "");
          if (staffCompanyKey !== companyKey) return;
          const dept = String(staffItem?.department ?? "").trim();
          if (!dept) return;
          uniqueDepartments.add(dept);
        });

        setDeptOptions(Array.from(uniqueDepartments).sort());
      })
      .catch(() => {
        setDeptOptions([]);
      });
  }, [form.companyId]);

  useEffect(() => {
    if (!form.companyId) {
      setRoleCodes([]);
      return;
    }

    request("GET", "/api/staffs")
      .then((response) => {
        const staffList = response?.data || [];
        const companyKey = String(form.companyId ?? "");
        const uniqueRoles = new Set();

        staffList.forEach((staffItem) => {
          const staffCompanyKey = String(staffItem?.companyId ?? "");
          if (staffCompanyKey !== companyKey) return;
          const roleCode = String(staffItem?.staffRoleCode ?? "").trim();
          if (!roleCode) return;
          uniqueRoles.add(roleCode);
        });

        setRoleCodes(Array.from(uniqueRoles).sort());
      })
      .catch(() => {
        setRoleCodes([]);
      });
  }, [form.companyId]);

  const getRoleName = (code) => {
    const found = roles.find((role) => role.staffRoleCode === code);
    return found ? found.stffRoleName : code;
  };

  const filteredDeptOptions = useMemo(() => {
    if (!deptSearch) return deptOptions;
    const searchLower = deptSearch.toLowerCase();
    return deptOptions.filter((dept) =>
      dept.toLowerCase().includes(searchLower),
    );
  }, [deptOptions, deptSearch]);

  const roleOptions = useMemo(
    () =>
      roleCodes.map((code) => ({
        code,
        name: getRoleName(code),
      })),
    [roleCodes, roles],
  );

  const filteredRoleOptions = useMemo(() => {
    if (!roleSearch) return roleOptions;
    const searchLower = roleSearch.toLowerCase();
    return roleOptions.filter((role) =>
      `${role.code} ${role.name}`.toLowerCase().includes(searchLower),
    );
  }, [roleOptions, roleSearch]);

  const validate = () => {
    let errs = {};
    if (!form.staffName || form.staffName.trim() === "") {
      errs.staffName = t("staffList.name", "Staff Name") + " is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "active" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      await request("PUT", `/api/staffs/${form.staffName}`, {
        ...form,
        serviceStartDate: form.serviceStartDate || null,
        serviceEndDate: form.serviceEndDate || null,
      });
      setSuccess(true);
      if (onCancel) onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
    }
    setLoading(false);
  };

  const handleSelectDepartment = (dept) => {
    setForm((prev) => ({
      ...prev,
      department: dept,
    }));
    setDeptDialogOpen(false);
    setDeptDialogJustClosed(true);
    setTimeout(() => setDeptDialogJustClosed(false), 300);
  };

  const handleCreateDepartment = () => {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      department: trimmed,
    }));
    setDeptOptions((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed].sort(),
    );
    setNewDept("");
    setDeptDialogOpen(false);
    setDeptDialogJustClosed(true);
    setTimeout(() => setDeptDialogJustClosed(false), 300);
  };

  const handleSelectRole = (code) => {
    setForm((prev) => ({
      ...prev,
      staffRoleCode: code,
    }));
    setRoleDialogOpen(false);
    setRoleDialogJustClosed(true);
    setTimeout(() => setRoleDialogJustClosed(false), 300);
  };

  const handleCreateRole = () => {
    const trimmed = newRole.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      staffRoleCode: trimmed,
    }));
    setRoleCodes((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed].sort(),
    );
    setNewRole("");
    setRoleDialogOpen(false);
    setRoleDialogJustClosed(true);
    setTimeout(() => setRoleDialogJustClosed(false), 300);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: { xs: "100%", sm: 520 },
        mx: "auto",
        mt: 2,
        mb: 2,
        background: "var(--color-gray-100)",
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
      }}
    >
      <h2
        style={{
          fontSize: "clamp(1.2rem, 4vw, 2rem)",
          margin: 0,
        }}
      >
        {t("staffList.editTitle", "Edit Staff")}
      </h2>
      <TextField
        label={t("staffList.name", "Staff Name")}
        name="staffName"
        value={form.staffName}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!errors.staffName}
        helperText={errors.staffName}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label={t("staffList.id", "Staff ID")}
        name="staffId"
        value={form.staffId}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("staffList.mobileNumber", "Mobile Number")}
        name="mobileNumber"
        value={form.mobileNumber}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label={t("staffList.number", "Staff Number")}
        name="staffNumber"
        value={form.staffNumber}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        select
        label={t("staffList.company", "Company")}
        name="companyId"
        value={form.companyId}
        onChange={handleChange}
        fullWidth
        margin="normal"
        disabled={!isUserLevelNine}
      >
        {filteredCompanies.map((company) => (
          <MenuItem key={company.companyId} value={company.companyId}>
            {company.companyName}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t("staffList.department", "Department")}
        name="department"
        value={form.department}
        onChange={handleChange}
        onClick={() => setDeptDialogOpen(true)}
        onFocus={() => !deptDialogJustClosed && setDeptDialogOpen(true)}
        fullWidth
        margin="normal"
        InputProps={{ readOnly: true }}
      />
      <TextField
        label={t("staffList.role", "Role")}
        name="staffRoleCode"
        value={form.staffRoleCode}
        onChange={handleChange}
        onClick={() => setRoleDialogOpen(true)}
        onFocus={() => !roleDialogJustClosed && setRoleDialogOpen(true)}
        fullWidth
        margin="normal"
        InputProps={{ readOnly: true }}
      />
      <TextField
        label={t("staffList.serviceStartDate", "Start Date")}
        name="serviceStartDate"
        type="date"
        value={formatDateForInput(form.serviceStartDate)}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label={t("staffList.serviceEndDate", "End Date")}
        name="serviceEndDate"
        type="date"
        value={formatDateForInput(form.serviceEndDate)}
        onChange={handleChange}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        select
        label={t("staffList.active", "Active")}
        name="active"
        value={form.active}
        onChange={handleChange}
        fullWidth
        margin="normal"
      >
        <MenuItem value={1}>{t("staffList.activeYes", "Active")}</MenuItem>
        <MenuItem value={0}>{t("staffList.activeNo", "Inactive")}</MenuItem>
      </TextField>
      {errorMsg && (
        <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
      {success && (
        <div style={{ color: "var(--color-success)", marginTop: 8 }}>
          {t("basic.true")}
        </div>
      )}
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {t("basic.save")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCancel(false)}
          disabled={loading}
        >
          {t("basic.cancel")}
        </Button>
      </Box>
      <Dialog
        open={deptDialogOpen}
        onClose={() => setDeptDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("staffList.department", "Department")}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label={t("staffList.searchPlaceholder", "Search staff...")}
            value={deptSearch}
            onChange={(e) => setDeptSearch(e.target.value)}
            fullWidth
            margin="dense"
          />
          <List dense sx={{ maxHeight: 240, overflow: "auto", mt: 1 }}>
            {filteredDeptOptions.length === 0 ? (
              <Typography sx={{ px: 2, py: 1 }} color="text.secondary">
                {t("staffList.noStaff", "No staff found")}
              </Typography>
            ) : (
              filteredDeptOptions.map((dept) => (
                <ListItemButton
                  key={dept}
                  onClick={() => handleSelectDepartment(dept)}
                >
                  <ListItemText primary={dept} />
                </ListItemButton>
              ))
            )}
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            {t("staffList.editTitle", "Edit Staff")} -{" "}
            {t("staffList.department", "Department")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label={t("staffList.department", "Department")}
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              fullWidth
              margin="dense"
            />
            <Button
              variant="contained"
              onClick={handleCreateDepartment}
              sx={{ alignSelf: "center", whiteSpace: "nowrap" }}
            >
              {t("basic.save")}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeptDialogOpen(false);
              setDeptDialogJustClosed(true);
              setTimeout(() => setDeptDialogJustClosed(false), 300);
            }}
          >
            {t("basic.cancel")}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("staffList.role", "Role")}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label={t("staffList.searchPlaceholder", "Search staff...")}
            value={roleSearch}
            onChange={(e) => setRoleSearch(e.target.value)}
            fullWidth
            margin="dense"
          />
          <List dense sx={{ maxHeight: 240, overflow: "auto", mt: 1 }}>
            {filteredRoleOptions.length === 0 ? (
              <Typography sx={{ px: 2, py: 1 }} color="text.secondary">
                {t("staffList.noStaff", "No staff found")}
              </Typography>
            ) : (
              filteredRoleOptions.map((role) => (
                <ListItemButton
                  key={role.code}
                  onClick={() => handleSelectRole(role.code)}
                >
                  <ListItemText
                    primary={role.name}
                    secondary={role.code !== role.name ? role.code : null}
                  />
                </ListItemButton>
              ))
            )}
          </List>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            {t("staffList.editTitle", "Edit Staff")} -{" "}
            {t("staffList.role", "Role")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label={t("staffList.role", "Role")}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              fullWidth
              margin="dense"
            />
            <Button
              variant="contained"
              onClick={handleCreateRole}
              sx={{ alignSelf: "center", whiteSpace: "nowrap" }}
            >
              {t("basic.save")}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRoleDialogOpen(false);
              setRoleDialogJustClosed(true);
              setTimeout(() => setRoleDialogJustClosed(false), 300);
            }}
          >
            {t("basic.cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffEdit;
