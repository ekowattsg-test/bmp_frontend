import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

const StaffSelectionDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  roleFilters = ["DELIVER"],
  confirmLabel,
  cancelLabel,
}) => {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState([]);
  const [operationStaffs, setOperationStaffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError("");
    setSearch("");
    setSelectedStaffId("");
    Promise.allSettled([
      request("GET", "/api/staffs", null, { skipBackendErrorDialog: true }),
      request("GET", "/api/operationstaffs", null, {
        skipBackendErrorDialog: true,
      }),
    ])
      .then(([staffRes, opRes]) => {
        if (staffRes.status === "fulfilled") {
          setStaffList(staffRes.value.data || []);
        } else {
          setFetchError(
            t("staffSelection.loadStaffFailed", "Failed to load staff list."),
          );
        }
        if (opRes.status === "fulfilled") {
          setOperationStaffs(opRes.value.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, [open, t]);

  const roleSet = useMemo(
    () => new Set(roleFilters.map(normalizeRole)),
    [roleFilters],
  );

  const eligibleStaff = useMemo(() => {
    const staffMap = new Map();
    staffList.forEach((s) => {
      staffMap.set(String(s.staffId || "").trim(), s);
    });

    const roleByStaffId = new Map();
    operationStaffs.forEach((os) => {
      const staffId = String(os.staffId || "").trim();
      const roleName = String(os.roleName || os.operationRoleName || "").trim();
      if (!roleName) return;
      if (!roleSet.has(normalizeRole(roleName))) return;
      if (!roleByStaffId.has(staffId)) {
        const staff = staffMap.get(staffId);
        if (staff) {
          roleByStaffId.set(staffId, {
            ...staff,
            operationRoleName: roleName,
          });
        }
      }
    });

    return Array.from(roleByStaffId.values());
  }, [staffList, operationStaffs, roleSet]);

  const filtered = useMemo(() => {
    if (!search.trim()) return eligibleStaff;
    const q = search.trim().toLowerCase();
    return eligibleStaff.filter((s) => {
      const name = String(s.staffName || "").toLowerCase();
      const id = String(s.staffId || "").toLowerCase();
      const role = String(s.operationRoleName || "").toLowerCase();
      return name.includes(q) || id.includes(q) || role.includes(q);
    });
  }, [eligibleStaff, search]);

  const handleConfirm = () => {
    const staff = eligibleStaff.find(
      (s) => String(s.staffId || "").trim() === selectedStaffId,
    );
    if (staff) onConfirm(staff);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography component="span" variant="h6" fontWeight={600}>
          {title || t("staffSelection.title", "Select Staff")}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        <TextField
          fullWidth
          size="small"
          placeholder={t("staffSelection.searchPlaceholder", "Search staff...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
        />
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : fetchError ? (
          <Typography
            sx={{ color: "var(--color-danger)", fontSize: "0.875rem" }}
          >
            {fetchError}
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {t("staffSelection.noStaff", "No eligible staff found.")}
          </Typography>
        ) : (
          <TableContainer
            sx={{
              border: "1px solid var(--color-gray-200)",
              borderRadius: 1,
              maxHeight: 320,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell sx={{ width: 48 }} />
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t("staffSelection.staffName", "Staff Name")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t("staffSelection.operationRole", "Operation Role")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((staff) => {
                  const staffId = String(staff.staffId || "").trim();
                  const isSelected = selectedStaffId === staffId;
                  return (
                    <TableRow
                      key={staffId}
                      hover
                      onClick={() => setSelectedStaffId(staffId)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell padding="checkbox">
                        <Radio
                          checked={isSelected}
                          onChange={() => setSelectedStaffId(staffId)}
                          value={staffId}
                        />
                      </TableCell>
                      <TableCell>{staff.staffName || "—"}</TableCell>
                      <TableCell>{staff.operationRoleName || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          {cancelLabel || t("basic.cancel", "Cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedStaffId || loading}
        >
          {confirmLabel || t("basic.confirm", "Confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

StaffSelectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  roleFilters: PropTypes.arrayOf(PropTypes.string),
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
};

export default StaffSelectionDialog;
