import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
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
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-secondary)",
];

const formatDateInput = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inDateRange = (value, from, to) => {
  const date = toDate(value);
  const fromDate = toDate(from);
  const toDateValue = toDate(to);
  if (!date || !fromDate || !toDateValue) return false;
  const normalized = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const start = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  const end = new Date(
    toDateValue.getFullYear(),
    toDateValue.getMonth(),
    toDateValue.getDate(),
  );
  return normalized >= start && normalized <= end;
};

const daysUntil = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
};

const isActive = (staff) => Number(staff?.active) === 1;

const riskRank = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const ENABLE_DEPARTMENT_ANALYSIS =
  String(import.meta.env.VITE_ENABLE_DEPARTMENT_ANALYSIS || "false")
    .trim()
    .toLowerCase() === "true";

const StaffSkillProfileAnalysis = ({ onBack }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);

  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const userCompanyId = userInfo?.companyId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staffRows, setStaffRows] = useState([]);
  const [profileRows, setProfileRows] = useState([]);

  const [dateFrom, setDateFrom] = useState(formatDateInput(new Date()));
  const [dateTo, setDateTo] = useState(formatDateInput(new Date()));
  const [department, setDepartment] = useState("");
  const [staffId, setStaffId] = useState("");

  useEffect(() => {
    loadAnalysisData();
  }, [userCompanyId, isUserLevelNine]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      setError("");

      const [staffResponse, profileResponse] = await Promise.all([
        request("GET", "/api/staffs"),
        request("GET", "/api/staffskillprofileviews"),
      ]);

      const allStaff = Array.isArray(staffResponse?.data)
        ? staffResponse.data
        : [];
      const allProfiles = Array.isArray(profileResponse?.data)
        ? profileResponse.data
        : [];

      const scopedStaff = allStaff.filter((staff) => {
        if (!isActive(staff)) return false;
        if (isUserLevelNine) return true;
        return String(staff?.companyId || "") === String(userCompanyId || "");
      });

      setStaffRows(scopedStaff);
      setProfileRows(allProfiles);
    } catch {
      setError(t("staffManagement.analysisLoadFailed"));
      setStaffRows([]);
      setProfileRows([]);
    } finally {
      setLoading(false);
    }
  };

  const departmentOptions = useMemo(() => {
    const values = new Set();
    staffRows.forEach((staff) => {
      const value = String(staff?.department || "").trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [staffRows]);

  const filteredStaffRows = useMemo(() => {
    return staffRows.filter((staff) => {
      if (
        ENABLE_DEPARTMENT_ANALYSIS &&
        department &&
        String(staff?.department || "") !== department
      ) {
        return false;
      }
      if (staffId && String(staff?.staffId || "") !== staffId) {
        return false;
      }
      return true;
    });
  }, [staffRows, department, staffId]);

  const filteredStaffIdSet = useMemo(() => {
    return new Set(filteredStaffRows.map((row) => String(row?.staffId || "")));
  }, [filteredStaffRows]);

  const filteredProfiles = useMemo(() => {
    return profileRows.filter((row) => {
      if (!filteredStaffIdSet.has(String(row?.staffId || ""))) {
        return false;
      }
      return inDateRange(row?.acquiredDate, dateFrom, dateTo);
    });
  }, [profileRows, filteredStaffIdSet, dateFrom, dateTo]);

  const expiringCounts = useMemo(() => {
    let c30 = 0;
    let c60 = 0;
    let c90 = 0;

    filteredProfiles.forEach((row) => {
      if (Number(row?.noExpiry) === 1) return;
      const diff = daysUntil(row?.expiryDate);
      if (diff === null) return;
      if (diff >= 0 && diff <= 30) c30 += 1;
      if (diff >= 0 && diff <= 60) c60 += 1;
      if (diff >= 0 && diff <= 90) c90 += 1;
    });

    return { c30, c60, c90 };
  }, [filteredProfiles]);

  const ownerBySkill = useMemo(() => {
    const map = new Map();
    filteredProfiles.forEach((row) => {
      const key = String(row?.staffSkillId || "");
      if (!key) return;
      const current = map.get(key) || {
        staffSkillId: key,
        skillName: String(row?.skillName || "").trim(),
        skillCategory: String(row?.skillCategory || "").trim(),
        owners: new Set(),
        departments: new Set(),
        expiring30Count: 0,
      };
      const rowStaffId = String(row?.staffId || "");
      if (rowStaffId) {
        current.owners.add(rowStaffId);
        const staff = staffRows.find(
          (s) => String(s?.staffId || "") === rowStaffId,
        );
        if (ENABLE_DEPARTMENT_ANALYSIS) {
          const dept = String(staff?.department || "").trim();
          if (dept) current.departments.add(dept);
        }
      }
      if (Number(row?.noExpiry) !== 1) {
        const diff = daysUntil(row?.expiryDate);
        if (diff !== null && diff >= 0 && diff <= 30) {
          current.expiring30Count += 1;
        }
      }
      map.set(key, current);
    });
    return map;
  }, [filteredProfiles, staffRows]);

  const skillRiskRows = useMemo(() => {
    const rows = Array.from(ownerBySkill.values()).map((item) => {
      const ownerCount = item.owners.size;
      let riskLevel = "LOW";
      if (ownerCount === 1 || item.expiring30Count >= ownerCount) {
        riskLevel = "HIGH";
      } else if (ownerCount === 2 || item.expiring30Count > 0) {
        riskLevel = "MEDIUM";
      }

      return {
        skillName: item.skillName,
        skillCategory: item.skillCategory,
        ownerCount,
        departmentsCovered: ENABLE_DEPARTMENT_ANALYSIS
          ? item.departments.size
          : 0,
        expiring30Count: item.expiring30Count,
        riskLevel,
      };
    });

    rows.sort((a, b) => {
      const r = riskRank[b.riskLevel] - riskRank[a.riskLevel];
      if (r !== 0) return r;
      return a.ownerCount - b.ownerCount;
    });

    return rows;
  }, [ownerBySkill]);

  const topCategories = useMemo(() => {
    const counts = new Map();
    filteredProfiles.forEach((row) => {
      const category = String(row?.skillCategory || "").trim();
      if (!category) return;
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => key);
  }, [filteredProfiles]);

  const coverageChartData = useMemo(() => {
    if (!ENABLE_DEPARTMENT_ANALYSIS) {
      const total = { department: t("staffManagement.analysisAllStaff") };
      filteredProfiles.forEach((row) => {
        const category = String(row?.skillCategory || "").trim();
        if (!category || !topCategories.includes(category)) return;
        total[category] = (total[category] || 0) + 1;
      });
      return [total];
    }

    const byDept = new Map();
    filteredStaffRows.forEach((staff) => {
      const dept = String(staff?.department || "").trim() || "-";
      if (!byDept.has(dept)) {
        byDept.set(dept, { department: dept });
      }
    });

    filteredProfiles.forEach((row) => {
      const rowStaffId = String(row?.staffId || "");
      const staff = filteredStaffRows.find(
        (s) => String(s?.staffId || "") === rowStaffId,
      );
      if (!staff) return;
      const dept = String(staff?.department || "").trim() || "-";
      const category = String(row?.skillCategory || "").trim();
      if (!category || !topCategories.includes(category)) return;

      const bucket = byDept.get(dept);
      bucket[category] = (bucket[category] || 0) + 1;
    });
    return Array.from(byDept.values());
  }, [filteredStaffRows, filteredProfiles, topCategories, t]);

  const expiryChartData = useMemo(() => {
    return [
      { bucket: "30", count: expiringCounts.c30 },
      { bucket: "60", count: expiringCounts.c60 },
      { bucket: "90", count: expiringCounts.c90 },
    ];
  }, [expiringCounts]);

  const ownershipChartData = useMemo(() => {
    const rows = Array.from(ownerBySkill.values())
      .map((item) => ({
        skillName: item.skillName || item.staffSkillId,
        ownerCount: item.owners.size,
      }))
      .sort((a, b) => b.ownerCount - a.ownerCount)
      .slice(0, 10);
    return rows;
  }, [ownerBySkill]);

  const totalActiveStaff = filteredStaffRows.length;
  const skilledStaffCount = useMemo(() => {
    const ids = new Set();
    filteredProfiles.forEach((row) => {
      const id = String(row?.staffId || "");
      if (id) ids.add(id);
    });
    return ids.size;
  }, [filteredProfiles]);

  const coveragePct =
    totalActiveStaff === 0 ? 0 : (skilledStaffCount / totalActiveStaff) * 100;
  const singleOwnerSkills = skillRiskRows.filter(
    (row) => row.ownerCount === 1,
  ).length;

  const hasData = filteredProfiles.length > 0;

  return (
    <Box>
      <HeaderBar
        showBackButton={Boolean(onBack)}
        onBack={onBack}
        backLabel={t("common.back")}
        title={t("staffManagement.staffSkillAnalysis")}
        subtitle={t("staffManagement.analysisSkillSubtitle")}
      />

      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          type="date"
          size="small"
          label={t("staffManagement.analysisDateFrom")}
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label={t("staffManagement.analysisDateTo")}
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        {ENABLE_DEPARTMENT_ANALYSIS ? (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>{t("staffManagement.analysisDepartment")}</InputLabel>
            <Select
              value={department}
              label={t("staffManagement.analysisDepartment")}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <MenuItem value="">
                {t("staffManagement.analysisAllDepartments")}
              </MenuItem>
              {departmentOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>{t("staffManagement.analysisStaff")}</InputLabel>
          <Select
            value={staffId}
            label={t("staffManagement.analysisStaff")}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <MenuItem value="">
              {t("staffManagement.analysisAllStaff")}
            </MenuItem>
            {filteredStaffRows.map((staff) => (
              <MenuItem key={staff.staffId} value={staff.staffId}>
                {`${staff.staffName} (${staff.staffId})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisTotalActiveStaff")}
              </Typography>
              <Typography variant="h4">{totalActiveStaff}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisSkilledStaffCoverage")}
              </Typography>
              <Typography variant="h4">{coveragePct.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisExpiring30Days")}
              </Typography>
              <Typography variant="h4">{expiringCounts.c30}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisSingleOwnerSkills")}
              </Typography>
              <Typography variant="h4">{singleOwnerSkills}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ py: 4, color: "text.secondary" }}>{t("common.loading")}</Box>
      ) : !hasData ? (
        <Alert severity="info">{t("staffManagement.analysisNoRows")}</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={7}>
              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {ENABLE_DEPARTMENT_ANALYSIS
                      ? t("staffManagement.analysisSkillCoverageByDepartment")
                      : t("staffManagement.analysisSkillCoverage")}
                  </Typography>
                  <Box sx={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={coverageChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {topCategories.map((category, index) => (
                          <Bar
                            key={category}
                            dataKey={category}
                            stackId="a"
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={5}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {t("staffManagement.analysisExpiryWindow")}
                  </Typography>
                  <Box sx={{ width: "100%", height: 145 }}>
                    <ResponsiveContainer>
                      <BarChart data={expiryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--color-warning)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {t("staffManagement.analysisSkillOwnership")}
                  </Typography>
                  <Box sx={{ width: "100%", height: 145 }}>
                    <ResponsiveContainer>
                      <BarChart data={ownershipChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="skillName" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="ownerCount" fill="var(--color-primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {t("staffManagement.analysisRiskTableTitle")}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("staffManagement.skillName")}</TableCell>
                      <TableCell>
                        {t("staffManagement.skillCategory")}
                      </TableCell>
                      <TableCell align="right">
                        {t("staffManagement.analysisOwnerCount")}
                      </TableCell>
                      {ENABLE_DEPARTMENT_ANALYSIS ? (
                        <TableCell align="right">
                          {t("staffManagement.analysisDepartmentsCovered")}
                        </TableCell>
                      ) : null}
                      <TableCell align="right">
                        {t("staffManagement.analysisExpiringCount")}
                      </TableCell>
                      <TableCell>
                        {t("staffManagement.analysisRiskLevel")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {skillRiskRows.map((row) => (
                      <TableRow key={`${row.skillName}-${row.skillCategory}`}>
                        <TableCell>{row.skillName || "-"}</TableCell>
                        <TableCell>{row.skillCategory || "-"}</TableCell>
                        <TableCell align="right">{row.ownerCount}</TableCell>
                        {ENABLE_DEPARTMENT_ANALYSIS ? (
                          <TableCell align="right">
                            {row.departmentsCovered}
                          </TableCell>
                        ) : null}
                        <TableCell align="right">
                          {row.expiring30Count}
                        </TableCell>
                        <TableCell>
                          {row.riskLevel === "HIGH"
                            ? t("staffManagement.analysisHigh")
                            : row.riskLevel === "MEDIUM"
                              ? t("staffManagement.analysisMedium")
                              : t("staffManagement.analysisLow")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default StaffSkillProfileAnalysis;
