import React, { useEffect, useMemo, useState } from "react";
import {
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";

const getLeaderId = (row) =>
  row?.projectLeaderId ||
  row?.id ||
  row?.projectleaderId ||
  row?.project_leader_id ||
  null;

const getLeaderStaffId = (row) =>
  row?.projectLeaderStaffId ||
  row?.staffId ||
  row?.leaderId ||
  row?.staffID ||
  "";

const getLeaderRoleCode = (row) => {
  const role = String(row?.projectRole || row?.role || "")
    .trim()
    .toUpperCase();
  if (role === "M" || role === "L" || role === "C") return role;
  if (role === "MANAGER") return "M";
  if (role === "LEADER") return "L";
  if (role === "CO-LEADER" || role === "COLEADER") return "C";
  return "M";
};

const toInputDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const toRoleCode = (value) => {
  const role = String(value || "")
    .trim()
    .toUpperCase();
  if (role === "M" || role === "L" || role === "C") return role;
  if (role === "MANAGER") return "M";
  if (role === "LEADER") return "L";
  if (role === "CO-LEADER" || role === "COLEADER") return "C";
  return "";
};

const ProjectEdit = ({ project, customers, onCancel }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    projectCode: project.projectCode || "",
    projectName: project.projectName || "",
    projectDescription: project.projectDescription || "",
    customerId:
      project.customerId !== null && project.customerId !== undefined
        ? project.customerId
        : "",
    briefingId:
      project.briefingId !== null && project.briefingId !== undefined
        ? String(project.briefingId)
        : "",
    startDate: project.startDate || "",
    endDate: project.endDate || "",
    projectLocation: project.projectLocation || "",
    status: project.status || "PLAN",
  });
  const [leaders, setLeaders] = useState([]);
  const [deletedLeaderIds, setDeletedLeaderIds] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const roleOptions = useMemo(
    () => [
      { value: "M", label: t("projectLeader.roleManager", "Manager") },
      { value: "L", label: t("projectLeader.roleLeader", "Leader") },
      { value: "C", label: t("projectLeader.roleCoLeader", "Co-Leader") },
    ],
    [t],
  );

  useEffect(() => {
    setLeadersLoading(true);
    Promise.all([
      request("GET", "/api/staffs"),
      request("GET", `/api/projectleaders/project/${project.projectCode}`),
    ])
      .then(([staffRes, leadersRes]) => {
        setStaffList(staffRes.data || []);

        const data = Array.isArray(leadersRes?.data) ? leadersRes.data : [];
        setLeaders(
          data.map((row, index) => ({
            tempId: `loaded-${Date.now()}-${index}`,
            id: getLeaderId(row),
            projectLeaderStaffId: String(getLeaderStaffId(row) || ""),
            projectRole: getLeaderRoleCode(row),
            roleStartDate: toInputDate(row.roleStartDate || row.startDate),
            roleEndDate: toInputDate(row.roleEndDate || row.endDate),
          })),
        );
      })
      .catch(() => {
        setStaffList([]);
        setLeaders([]);
      })
      .finally(() => setLeadersLoading(false));
  }, [project.projectCode]);

  useEffect(() => {
    request("GET", "/api/briefings")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const activeRows = rows.filter(
          (row) => String(row?.active ?? "").trim() === "1",
        );
        setBriefings(activeRows);
        if (activeRows.length > 0) {
          const firstBriefingId = String(
            activeRows[0]?.briefingId || "",
          ).trim();
          setForm((prev) => {
            const current = String(prev.briefingId || "").trim();
            const existsInActive = activeRows.some(
              (row) => String(row?.briefingId || "").trim() === current,
            );
            if (current && existsInActive) return prev;
            return { ...prev, briefingId: firstBriefingId };
          });
        }
      })
      .catch(() => setBriefings([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorMsg("");
  };

  const handleAddLeader = () => {
    setLeaders((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}-${prev.length}`,
        id: null,
        projectLeaderStaffId: "",
        projectRole: "",
        roleStartDate: "",
        roleEndDate: null,
      },
    ]);
  };

  const handleRemoveLeader = (tempId) => {
    setLeaders((prev) => {
      const found = prev.find((row) => row.tempId === tempId);
      if (found?.id) {
        setDeletedLeaderIds((deleted) => [...deleted, found.id]);
      }
      return prev.filter((row) => row.tempId !== tempId);
    });
  };

  const handleLeaderChange = (tempId, field, value) => {
    setLeaders((prev) =>
      prev.map((row) =>
        row.tempId === tempId ? { ...row, [field]: String(value || "") } : row,
      ),
    );
  };

  const getRoleOptionsForRow = (tempId, currentRole) => {
    const currentRoleCode = toRoleCode(currentRole);
    const usedRolesInOtherRows = leaders
      .filter((row) => row.tempId !== tempId)
      .map((row) => toRoleCode(row.projectRole));

    return roleOptions.filter((option) => {
      if (option.value === "C") return true;
      if (option.value === currentRoleCode) return true;
      return !usedRolesInOtherRows.includes(option.value);
    });
  };

  const getStaffOptionsForRow = (tempId, currentStaffId) => {
    const selectedStaffIds = leaders
      .filter((row) => row.tempId !== tempId)
      .map((row) => String(row.projectLeaderStaffId || "").trim())
      .filter(Boolean);

    const normalizedCurrent = String(currentStaffId || "").trim();

    return staffList.filter((staff) => {
      const staffId = String(staff.staffId || "").trim();
      return (
        staffId === normalizedCurrent || !selectedStaffIds.includes(staffId)
      );
    });
  };

  const validate = () => {
    if (!form.projectName.trim()) {
      setErrorMsg(`${t("project.projectName")} is required`);
      return false;
    }

    if (
      leaders.some(
        (row) =>
          row.projectLeaderStaffId &&
          (!row.projectRole ||
            !["M", "L", "C"].includes(String(row.projectRole))),
      )
    ) {
      setErrorMsg(
        t("projectLeader.validationRequired", "Leader and role are required."),
      );
      return false;
    }

    if (leaders.some((row) => row.projectRole && !row.projectLeaderStaffId)) {
      setErrorMsg(
        t("projectLeader.validationRequired", "Leader and role are required."),
      );
      return false;
    }

    return true;
  };

  const buildLeaderPayload = (row) => ({
    projectCode: form.projectCode,
    projectLeaderStaffId: row.projectLeaderStaffId,
    projectRole: row.projectRole,
    roleStartDate: row.roleStartDate || null,
    roleEndDate: row.roleEndDate || null,
    active: row.roleEndDate ? 0 : 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!validate()) return;

    setLoading(true);

    try {
      await request("PUT", `/api/projects/${project.projectCode}`, {
        ...form,
        customerId: form.customerId !== "" ? Number(form.customerId) : null,
        briefingId: form.briefingId !== "" ? Number(form.briefingId) : null,
        status: project.status,
      });

      for (const leaderId of deletedLeaderIds) {
        await request("DELETE", `/api/projectleaders/${leaderId}`);
      }

      const validLeaders = leaders.filter((row) => row.projectLeaderStaffId);
      for (const row of validLeaders) {
        if (row.id) {
          await request(
            "PUT",
            `/api/projectleaders/${row.id}`,
            buildLeaderPayload(row),
          );
        } else {
          await request("POST", "/api/projectleaders", buildLeaderPayload(row));
        }
      }

      onCancel(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || t("basic.false"));
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {t("project.editTitle", "Edit Project")} - {form.projectCode}
      </Typography>

      <form onSubmit={handleSubmit}>
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
            <TextField
              fullWidth
              label={t("project.projectCode")}
              value={form.projectCode}
              disabled
            />

            <TextField
              fullWidth
              label={t("project.projectName")}
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
              required
            />

            <FormControl fullWidth>
              <InputLabel>{t("project.customerId")}</InputLabel>
              <Select
                name="customerId"
                value={form.customerId}
                onChange={handleChange}
                label={t("project.customerId")}
              >
                <MenuItem value="">{t("project.noCustomer")}</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.customerId} value={c.customerId}>
                    {c.customerName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={t("project.status")}
              value={
                {
                  PLAN: t("project.statusPlan"),
                  ACTIVE: t("project.statusActive"),
                  COMPLETE: t("project.statusComplete"),
                  CLOSE: t("project.statusClose"),
                }[project.status] ||
                project.status ||
                ""
              }
              disabled
            />

            <TextField
              fullWidth
              label={t("project.startDate")}
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label={t("project.endDate")}
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label={t("project.projectDescription")}
              name="projectDescription"
              value={form.projectDescription}
              onChange={handleChange}
              multiline
              rows={2}
            />

            <TextField
              fullWidth
              label={t("project.projectLocation")}
              name="projectLocation"
              value={form.projectLocation}
              onChange={handleChange}
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>{t("project.briefingId", "Briefing")}</InputLabel>
              <Select
                name="briefingId"
                value={form.briefingId}
                onChange={handleChange}
                label={t("project.briefingId", "Briefing")}
              >
                {briefings.map((briefing) => (
                  <MenuItem
                    key={briefing.briefingId}
                    value={String(briefing.briefingId)}
                  >
                    {briefing.briefingTitle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

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
              onClick={handleAddLeader}
              size="small"
            >
              {t("projectLeader.add", "Add")}
            </Button>
          </Box>

          {leadersLoading ? (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                backgroundColor: "var(--color-gray-100)",
                borderRadius: 1,
              }}
            >
              <Typography color="text.secondary">
                {t("basic.loading", "Loading...")}
              </Typography>
            </Box>
          ) : leaders.length === 0 ? (
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
            <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "background.default" }}>
                    <TableCell>{t("projectLeader.leader", "Leader")}</TableCell>
                    <TableCell>{t("projectLeader.role", "Role")}</TableCell>
                    <TableCell>
                      {t("projectLeader.startDate", "Start Date")}
                    </TableCell>
                    <TableCell align="center">
                      {t("basic.actions", "Actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaders.map((row) => (
                    <TableRow key={row.tempId}>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <InputLabel>
                            {t("projectLeader.leader", "Leader")}
                          </InputLabel>
                          <Select
                            label={t("projectLeader.leader", "Leader")}
                            value={row.projectLeaderStaffId}
                            onChange={(e) =>
                              handleLeaderChange(
                                row.tempId,
                                "projectLeaderStaffId",
                                e.target.value,
                              )
                            }
                          >
                            {getStaffOptionsForRow(
                              row.tempId,
                              row.projectLeaderStaffId,
                            ).map((staff) => {
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
                            })}
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
                            value={row.projectRole}
                            onChange={(e) =>
                              handleLeaderChange(
                                row.tempId,
                                "projectRole",
                                e.target.value,
                              )
                            }
                          >
                            {getRoleOptionsForRow(
                              row.tempId,
                              row.projectRole,
                            ).map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>

                      <TableCell>
                        <TextField
                          size="small"
                          type="date"
                          value={row.roleStartDate}
                          onChange={(e) =>
                            handleLeaderChange(
                              row.tempId,
                              "roleStartDate",
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
                            onClick={() => handleRemoveLeader(row.tempId)}
                            title={t("basic.delete", "Delete")}
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

        {errorMsg && (
          <div style={{ color: "var(--color-danger)", marginTop: 8 }}>
            {errorMsg}
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
      </form>
    </Box>
  );
};

export default ProjectEdit;
