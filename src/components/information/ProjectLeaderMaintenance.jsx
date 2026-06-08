import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { LoadingState } from "../common";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const roleRank = (role) => {
  const upper = String(role || "")
    .trim()
    .toUpperCase();
  if (upper === "M") return 0;
  if (upper === "L") return 1;
  if (upper === "C") return 2;

  const normalized = normalizeRole(role);
  if (normalized === "manager") return 0;
  if (normalized === "leader") return 1;
  if (normalized === "co-leader" || normalized === "coleader") return 2;
  return 3;
};

const parseDate = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getLeaderId = (row) =>
  row?.projectLeaderId ||
  row?.id ||
  row?.projectleaderId ||
  row?.project_leader_id ||
  null;

const getLeaderRole = (row) =>
  row?.role || row?.roleName || row?.leaderRole || "";

const getLeaderRoleCode = (row) => {
  const direct = String(
    row?.projectRole || row?.role || row?.roleName || row?.leaderRole || "",
  )
    .trim()
    .toUpperCase();

  if (direct === "M" || direct === "L" || direct === "C") return direct;

  const normalized = normalizeRole(direct);
  if (normalized === "manager") return "M";
  if (normalized === "leader") return "L";
  if (normalized === "co-leader" || normalized === "coleader") return "C";
  return "M";
};

const getLeaderStaffId = (row) =>
  row?.projectLeaderStaffId ||
  row?.staffId ||
  row?.leaderId ||
  row?.staffID ||
  "";

const getLeaderStartDate = (row) => row?.roleStartDate || row?.startDate || "";

const getLeaderEndDate = (row) => row?.roleEndDate || row?.endDate || "";

const toRoleLabel = (code, t) => {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (normalized === "M") return t("projectLeader.roleManager", "Manager");
  if (normalized === "L") return t("projectLeader.roleLeader", "Leader");
  if (normalized === "C") return t("projectLeader.roleCoLeader", "Co-Leader");
  return t("projectLeader.roleManager", "Manager");
};

const toInputDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const ProjectLeaderMaintenance = ({ project, onBack }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [deletedRows, setDeletedRows] = useState([]);

  const roleOptions = useMemo(
    () => [
      { value: "M", label: t("projectLeader.roleManager", "Manager") },
      { value: "L", label: t("projectLeader.roleLeader", "Leader") },
      { value: "C", label: t("projectLeader.roleCoLeader", "Co-Leader") },
    ],
    [t],
  );

  const loadData = () => {
    setLoading(true);
    setErrorMsg("");

    return Promise.all([
      request("GET", `/api/projectleaders/project/${project.projectCode}`),
      request("GET", "/api/staffs"),
    ])
      .then(([leadersRes, staffRes]) => {
        const leadersData = Array.isArray(leadersRes?.data)
          ? leadersRes.data
          : [];
        const staffData = Array.isArray(staffRes?.data) ? staffRes.data : [];

        setStaffList(staffData);

        const map = {};
        staffData.forEach((staff) => {
          const fullName =
            staff.staffName ||
            [staff.firstName, staff.lastName].filter(Boolean).join(" ").trim();
          map[String(staff.staffId)] = fullName || staff.staffId || "";
        });

        setStaffMap(map);
        const filteredRows = leadersData;

        const sorted = [...filteredRows].sort((a, b) => {
          const aEnd = getLeaderEndDate(a) ? 1 : 0;
          const bEnd = getLeaderEndDate(b) ? 1 : 0;
          if (aEnd !== bEnd) return aEnd - bEnd;

          const aRank = roleRank(getLeaderRoleCode(a));
          const bRank = roleRank(getLeaderRoleCode(b));
          if (aRank !== bRank) return aRank - bRank;

          if (aRank === 2) {
            const aStart = parseDate(getLeaderStartDate(a));
            const bStart = parseDate(getLeaderStartDate(b));
            if (aStart !== null && bStart !== null) return aStart - bStart;
            if (aStart !== null) return -1;
            if (bStart !== null) return 1;
          }

          const aName = String(
            a.staffName ||
              map[String(getLeaderStaffId(a))] ||
              getLeaderStaffId(a) ||
              "",
          );
          const bName = String(
            b.staffName ||
              map[String(getLeaderStaffId(b))] ||
              getLeaderStaffId(b) ||
              "",
          );
          return aName.localeCompare(bName);
        });

        setLeaders(sorted);
        setRows(
          sorted.map((row, index) => {
            const id = getLeaderId(row);
            return {
              rowKey: id ? `id-${id}` : `tmp-loaded-${Date.now()}-${index}`,
              id,
              staffId: String(getLeaderStaffId(row) || ""),
              role: getLeaderRoleCode(row),
              startDate: toInputDate(getLeaderStartDate(row)),
              endDate: toInputDate(getLeaderEndDate(row)),
              isNew: !id,
              raw: row,
            };
          }),
        );
        setDeletedRows([]);
      })
      .catch(() => {
        setLeaders([]);
        setRows([]);
        setDeletedRows([]);
        setStaffMap({});
        setErrorMsg(
          t("projectLeader.loadFailed", "Failed to load project leaders."),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let mounted = true;

    loadData().finally(() => {
      if (!mounted) return;
    });

    return () => {
      mounted = false;
    };
  }, [project.projectCode]);

  const handleAddRow = () => {
    setErrorMsg("");
    setRows((prev) => [
      ...prev,
      {
        rowKey: `tmp-new-${Date.now()}-${prev.length}`,
        id: null,
        staffId: "",
        role: "",
        startDate: "",
        roleEndDate: null,
        isNew: true,
      },
    ]);
  };

  const handleRowChange = (rowKey, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowKey === rowKey ? { ...row, [field]: String(value || "") } : row,
      ),
    );
  };

  const handleRemoveRow = (rowKey) => {
    setErrorMsg("");
    setRows((prev) => {
      const found = prev.find((row) => row.rowKey === rowKey);
      if (found && found.id) {
        setDeletedRows((deleted) => [...deleted, found]);
      }
      return prev.filter((row) => row.rowKey !== rowKey);
    });
  };

  const getRoleOptionsForRow = (rowKey, currentRole) => {
    const currentRoleCode = getLeaderRoleCode({ role: currentRole });
    const usedRolesInOtherRows = rows
      .filter((row) => row.rowKey !== rowKey)
      .map((row) => getLeaderRoleCode({ role: row.role }));

    return roleOptions.filter((option) => {
      if (option.value === "C") return true;
      if (option.value === currentRoleCode) return true;
      return !usedRolesInOtherRows.includes(option.value);
    });
  };

  const getStaffOptionsForRow = (rowKey, currentStaffId) => {
    const selectedStaffIds = rows
      .filter((row) => row.rowKey !== rowKey)
      .map((row) => String(row.staffId || "").trim())
      .filter(Boolean);

    const normalizedCurrent = String(currentStaffId || "").trim();

    return staffList.filter((staff) => {
      const staffId = String(staff.staffId || "").trim();
      return (
        staffId === normalizedCurrent || !selectedStaffIds.includes(staffId)
      );
    });
  };

  const handleResetChanges = () => {
    setErrorMsg("");
    setRows(
      leaders.map((row, index) => {
        const id = getLeaderId(row);
        return {
          rowKey: id ? `id-${id}` : `tmp-loaded-${Date.now()}-${index}`,
          id,
          staffId: String(getLeaderStaffId(row) || ""),
          role: getLeaderRoleCode(row),
          startDate: toInputDate(getLeaderStartDate(row)),
          endDate: toInputDate(getLeaderEndDate(row)),
          isNew: !id,
          raw: row,
        };
      }),
    );
    setDeletedRows([]);
  };

  const handleSave = async () => {
    if (rows.some((row) => !row.staffId || !row.role)) {
      setErrorMsg(
        t("projectLeader.validationRequired", "Leader and role are required."),
      );
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      for (const row of deletedRows) {
        if (row.id) {
          await request("DELETE", `/api/projectleaders/${row.id}`);
        } else {
          // Unsaved row removed locally; no backend delete needed.
        }
      }

      for (const row of rows) {
        const payload = {
          projectCode: project.projectCode,
          projectLeaderStaffId: row.staffId,
          projectRole: row.role,
          roleStartDate: row.startDate || null,
          roleEndDate: row.roleEndDate || null,
          active: row.roleEndDate ? 0 : 1,
        };

        if (row.id) {
          await request("PUT", `/api/projectleaders/${row.id}`, payload);
        } else {
          await request("POST", "/api/projectleaders", payload);
        }
      }

      await loadData();
    } catch {
      setErrorMsg(
        t(
          "projectLeader.saveFailed",
          "Failed to save project leader. Please verify the input and try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        message={t("projectLeader.loading", "Loading project leaders...")}
      />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">
          {t("projectLeader.title", "Project Leader Maintenance")}
        </Typography>
        <Button variant="outlined" onClick={onBack}>
          {t("basic.back")}
        </Button>
      </Box>

      <Box
        sx={{
          backgroundColor: "var(--color-gray-100)",
          p: { xs: 2, sm: 3 },
          borderRadius: 1,
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("projectLeader.detailsTitle", "Project Details")}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t("project.projectCode", "Project Code")}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {project.projectCode || "-"}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              {t("project.projectName", "Project Name")}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {project.projectName || "-"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {errorMsg && (
        <Typography sx={{ mb: 2, color: "error.main" }}>{errorMsg}</Typography>
      )}

      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">
            {t("projectLeader.itemsTitle", "Project Leaders")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            size="small"
            disabled={saving}
          >
            {t("projectLeader.add", "Add")}
          </Button>
        </Box>

        {rows.length === 0 ? (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              backgroundColor: "var(--color-gray-100)",
              borderRadius: 1,
            }}
          >
            <Typography color="text.secondary">
              {t(
                "projectLeader.noRowsAdded",
                "No project leaders added yet. Click 'Add' to begin.",
              )}
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            sx={{ border: "1px solid var(--color-gray-200)", borderRadius: 2 }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "background.default" }}>
                  <TableCell sx={{ fontWeight: 600, width: 260 }}>
                    {t("projectLeader.leader", "Leader")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 180 }}>
                    {t("projectLeader.role", "Role")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 170 }}>
                    {t("projectLeader.startDate", "Start Date")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 170 }}>
                    {t("basic.delete", "Delete")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.rowKey}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <InputLabel>
                          {t("projectLeader.leader", "Leader")}
                        </InputLabel>
                        <Select
                          label={t("projectLeader.leader", "Leader")}
                          value={row.staffId}
                          onChange={(e) =>
                            handleRowChange(
                              row.rowKey,
                              "staffId",
                              e.target.value,
                            )
                          }
                        >
                          {getStaffOptionsForRow(row.rowKey, row.staffId).map(
                            (staff) => {
                              const displayName =
                                staff.staffName ||
                                [staff.firstName, staff.lastName]
                                  .filter(Boolean)
                                  .join(" ")
                                  .trim() ||
                                staff.staffId;
                              return (
                                <MenuItem
                                  key={staff.staffId}
                                  value={String(staff.staffId)}
                                >
                                  {displayName}
                                </MenuItem>
                              );
                            },
                          )}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      <FormControl fullWidth size="small">
                        <InputLabel>
                          {t("projectLeader.role", "Role")}
                        </InputLabel>
                        <Select
                          label={t("projectLeader.role", "Role")}
                          value={row.role}
                          onChange={(e) =>
                            handleRowChange(row.rowKey, "role", e.target.value)
                          }
                        >
                          {getRoleOptionsForRow(row.rowKey, row.role).map(
                            (option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {toRoleLabel(option.value, t)}
                              </MenuItem>
                            ),
                          )}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        value={row.startDate}
                        onChange={(e) =>
                          handleRowChange(
                            row.rowKey,
                            "startDate",
                            e.target.value,
                          )
                        }
                        fullWidth
                      />
                    </TableCell>

                    <TableCell align="center">
                      {!row.id ? (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveRow(row.rowKey)}
                          title={t("basic.delete", "Delete")}
                          disabled={saving}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {t("basic.save", "Save")}
        </Button>
        <Button
          variant="outlined"
          onClick={handleResetChanges}
          disabled={saving || loading}
        >
          {t("basic.cancel", "Cancel")}
        </Button>
      </Box>
    </Box>
  );
};

ProjectLeaderMaintenance.propTypes = {
  project: PropTypes.shape({
    projectCode: PropTypes.string,
    projectName: PropTypes.string,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
};

export default ProjectLeaderMaintenance;
