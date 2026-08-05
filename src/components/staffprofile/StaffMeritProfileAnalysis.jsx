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
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AuthContext } from "../../context/authContext";
import { request } from "../../helpers/axios_helper";
import { HeaderBar } from "../common";

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

const toMonthKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

const riskRank = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const ENABLE_DEPARTMENT_ANALYSIS =
  String(import.meta.env.VITE_ENABLE_DEPARTMENT_ANALYSIS || "false")
    .trim()
    .toLowerCase() === "true";

const StaffMeritProfileAnalysis = ({ onBack }) => {
  const { t } = useTranslation();
  const { userInfo } = useContext(AuthContext);

  const userLevel = userInfo?.userLevel || userInfo?.level || 0;
  const isUserLevelNine = userLevel === 9 || userLevel === "9";
  const userCompanyId = userInfo?.companyId;

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () => formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
    [today],
  );
  const defaultTo = useMemo(() => formatDateInput(today), [today]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [department, setDepartment] = useState("");
  const [staffId, setStaffId] = useState("");

  const [staffRows, setStaffRows] = useState([]);
  const [normalizedRows, setNormalizedRows] = useState([]);

  useEffect(() => {
    loadAnalysisData();
  }, [isUserLevelNine, userCompanyId]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        staffResponse,
        meritProfilesResponse,
        meritDefsResponse,
        usersResponse,
      ] = await Promise.all([
        request("GET", "/api/staffs"),
        request("GET", "/api/staffmeritprofiles"),
        request("GET", "/api/staffmerits"),
        request("GET", "/api/users"),
      ]);

      const allStaff = Array.isArray(staffResponse?.data)
        ? staffResponse.data
        : [];
      const allProfiles = Array.isArray(meritProfilesResponse?.data)
        ? meritProfilesResponse.data
        : [];
      const allMeritDefs = Array.isArray(meritDefsResponse?.data)
        ? meritDefsResponse.data
        : [];
      const allUsers = Array.isArray(usersResponse?.data)
        ? usersResponse.data
        : [];

      const scopedStaff = allStaff.filter((staff) => {
        if (Number(staff?.active) !== 1) return false;
        if (isUserLevelNine) return true;
        return String(staff?.companyId || "") === String(userCompanyId || "");
      });

      const staffMap = scopedStaff.reduce((acc, staff) => {
        const key = String(staff?.staffId || "").trim();
        if (key) acc[key] = staff;
        return acc;
      }, {});

      const meritMap = allMeritDefs.reduce((acc, merit) => {
        const key = String(merit?.staffMeritId || "").trim();
        if (key) acc[key] = merit;
        return acc;
      }, {});

      const userMap = allUsers.reduce((acc, user) => {
        const key = String(user?.id || "").trim();
        if (key) acc[key] = String(user?.login || "").trim();
        return acc;
      }, {});

      const normalized = allProfiles
        .map((row) => {
          const rowStaffId = String(row?.staffId || "").trim();
          const staff = staffMap[rowStaffId];
          if (!staff) return null;

          const meritDef =
            meritMap[String(row?.staffMeritId || "").trim()] || null;
          const meritCategory = String(meritDef?.meritCategory || "")
            .trim()
            .toUpperCase();
          const meritName = String(meritDef?.meritName || "").trim();
          const issuedByRaw = String(row?.issuedBy || "").trim();
          const issuedByDisplay = userMap[issuedByRaw] || issuedByRaw;

          return {
            ...row,
            staffName: String(staff?.staffName || "").trim(),
            department: String(staff?.department || "").trim(),
            meritName,
            meritCategory,
            issuedByDisplay,
          };
        })
        .filter(Boolean);

      setStaffRows(scopedStaff);
      setNormalizedRows(normalized);
    } catch {
      setError(t("staffManagement.analysisLoadFailed"));
      setStaffRows([]);
      setNormalizedRows([]);
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

  const filteredRows = useMemo(() => {
    return normalizedRows.filter((row) => {
      if (!filteredStaffIdSet.has(String(row?.staffId || ""))) {
        return false;
      }
      return inDateRange(row?.issuedDate, dateFrom, dateTo);
    });
  }, [normalizedRows, filteredStaffIdSet, dateFrom, dateTo]);

  const activeStaffCount = filteredStaffRows.length;

  const meritCount = filteredRows.filter(
    (row) => String(row?.meritCategory || "") === "M",
  ).length;
  const demeritCount = filteredRows.filter(
    (row) => String(row?.meritCategory || "") === "D",
  ).length;
  const netMeritScore = filteredRows.reduce(
    (sum, row) => sum + Number(row?.meritPoints || 0),
    0,
  );
  const ratio = demeritCount === 0 ? meritCount : meritCount / demeritCount;

  const monthlyTrendData = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const monthKey = toMonthKey(row?.issuedDate);
      if (!monthKey) return;
      const current = map.get(monthKey) || {
        month: monthKey,
        meritPoints: 0,
        demeritPoints: 0,
        netPoints: 0,
      };
      const points = Number(row?.meritPoints || 0);
      if (String(row?.meritCategory || "") === "M") {
        current.meritPoints += points;
      } else if (String(row?.meritCategory || "") === "D") {
        current.demeritPoints += Math.abs(points);
      }
      current.netPoints += points;
      map.set(monthKey, current);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }, [filteredRows]);

  const meritItemData = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const meritName = String(row?.meritName || "").trim() || "-";
      const current = map.get(meritName) || {
        meritName,
        meritCount: 0,
        demeritCount: 0,
      };
      if (String(row?.meritCategory || "") === "M") {
        current.meritCount += 1;
      } else if (String(row?.meritCategory || "") === "D") {
        current.demeritCount += 1;
      }
      map.set(meritName, current);
    });

    return Array.from(map.values())
      .sort(
        (a, b) =>
          b.meritCount + b.demeritCount - (a.meritCount + a.demeritCount),
      )
      .slice(0, 10);
  }, [filteredRows]);

  const previousPeriodRows = useMemo(() => {
    const fromDate = toDate(dateFrom);
    const toDateValue = toDate(dateTo);
    if (!fromDate || !toDateValue) return [];

    const daySpan =
      Math.floor((toDateValue.getTime() - fromDate.getTime()) / 86400000) + 1;
    const previousTo = new Date(fromDate.getTime() - 86400000);
    const previousFrom = new Date(
      previousTo.getTime() - (daySpan - 1) * 86400000,
    );

    return normalizedRows.filter((row) => {
      if (!filteredStaffIdSet.has(String(row?.staffId || ""))) {
        return false;
      }
      return inDateRange(
        row?.issuedDate,
        formatDateInput(previousFrom),
        formatDateInput(previousTo),
      );
    });
  }, [normalizedRows, filteredStaffIdSet, dateFrom, dateTo]);

  const departmentRiskRows = useMemo(() => {
    const departments = new Map();

    filteredStaffRows.forEach((staff) => {
      const dept = String(staff?.department || "").trim() || "-";
      if (!departments.has(dept)) {
        departments.set(dept, {
          department: dept,
          teamStaff: new Set(),
          demeritCount: 0,
          netScore: 0,
          previousNetScore: 0,
        });
      }
      departments.get(dept).teamStaff.add(String(staff?.staffId || ""));
    });

    filteredRows.forEach((row) => {
      const dept = String(row?.department || "").trim() || "-";
      if (!departments.has(dept)) return;
      const bucket = departments.get(dept);
      const points = Number(row?.meritPoints || 0);
      bucket.netScore += points;
      if (String(row?.meritCategory || "") === "D") {
        bucket.demeritCount += 1;
      }
    });

    previousPeriodRows.forEach((row) => {
      const dept = String(row?.department || "").trim() || "-";
      if (!departments.has(dept)) return;
      const bucket = departments.get(dept);
      bucket.previousNetScore += Number(row?.meritPoints || 0);
    });

    const rows = Array.from(departments.values()).map((item) => {
      const teamSize = item.teamStaff.size;
      const demeritRate = teamSize === 0 ? 0 : item.demeritCount / teamSize;
      const trendVsPrevious = item.netScore - item.previousNetScore;

      let riskLevel = "LOW";
      if (demeritRate >= 1 || trendVsPrevious <= -5) {
        riskLevel = "HIGH";
      } else if (demeritRate >= 0.5 || trendVsPrevious < 0) {
        riskLevel = "MEDIUM";
      }

      return {
        department: item.department,
        teamSize,
        demeritCount: item.demeritCount,
        netScore: item.netScore,
        demeritRate,
        trendVsPrevious,
        riskLevel,
      };
    });

    rows.sort((a, b) => {
      const riskDiff = riskRank[b.riskLevel] - riskRank[a.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return b.demeritRate - a.demeritRate;
    });

    return rows;
  }, [filteredRows, filteredStaffRows, previousPeriodRows]);

  const riskScatterData = useMemo(() => {
    return departmentRiskRows.map((row) => ({
      department: row.department,
      x: row.demeritRate,
      y: row.teamSize === 0 ? 0 : row.netScore / row.teamSize,
      z: row.teamSize,
    }));
  }, [departmentRiskRows]);

  const issuerConsistencyData = useMemo(() => {
    if (activeStaffCount === 0) return [];
    const map = new Map();
    filteredRows.forEach((row) => {
      const issuer = String(row?.issuedByDisplay || "").trim() || "-";
      map.set(issuer, (map.get(issuer) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([issuer, count]) => ({
        issuer,
        value: (count / activeStaffCount) * 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRows, activeStaffCount]);

  return (
    <Box>
      <HeaderBar
        showBackButton={Boolean(onBack)}
        onBack={onBack}
        backLabel={t("common.back")}
        title={t("staffManagement.staffMeritAnalysis")}
        subtitle={t("staffManagement.analysisMeritSubtitle")}
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
                {t("staffManagement.analysisNetMeritScore")}
              </Typography>
              <Typography variant="h4">{netMeritScore}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisMeritCount")}
              </Typography>
              <Typography variant="h4">{meritCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisDemeritCount")}
              </Typography>
              <Typography variant="h4">{demeritCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {t("staffManagement.analysisMeritDemeritRatio")}
              </Typography>
              <Typography variant="h4">{ratio.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ py: 4, color: "text.secondary" }}>{t("common.loading")}</Box>
      ) : filteredRows.length === 0 ? (
        <Alert severity="info">{t("staffManagement.analysisNoRows")}</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={7}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {t("staffManagement.analysisMonthlyNetTrend")}
                  </Typography>
                  <Box sx={{ width: "100%", height: 290 }}>
                    <ResponsiveContainer>
                      <ComposedChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="meritPoints"
                          fill="var(--color-success)"
                          name={t("staffManagement.analysisMeritSeries")}
                        />
                        <Bar
                          dataKey="demeritPoints"
                          fill="var(--color-danger)"
                          name={t("staffManagement.analysisDemeritSeries")}
                        />
                        <Line
                          type="monotone"
                          dataKey="netPoints"
                          stroke="var(--color-primary)"
                          strokeWidth={2}
                          name={t("staffManagement.analysisNetSeries")}
                        />
                      </ComposedChart>
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
                    {t("staffManagement.analysisMeritDemeritByItem")}
                  </Typography>
                  <Box sx={{ width: "100%", height: 290 }}>
                    <ResponsiveContainer>
                      <BarChart data={meritItemData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="meritName" hide />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="meritCount"
                          stackId="a"
                          fill="var(--color-success)"
                          name={t("staffManagement.analysisMeritCount")}
                        />
                        <Bar
                          dataKey="demeritCount"
                          stackId="a"
                          fill="var(--color-danger)"
                          name={t("staffManagement.analysisDemeritCount")}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={5}>
              {ENABLE_DEPARTMENT_ANALYSIS ? (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 1, fontWeight: 600 }}
                    >
                      {t("staffManagement.analysisDepartmentRiskScatter")}
                    </Typography>
                    <Box sx={{ width: "100%", height: 230 }}>
                      <ResponsiveContainer>
                        <ScatterChart>
                          <CartesianGrid />
                          <XAxis
                            type="number"
                            dataKey="x"
                            name={t("staffManagement.analysisDemeritRate")}
                          />
                          <YAxis
                            type="number"
                            dataKey="y"
                            name={t("staffManagement.analysisNetScore")}
                          />
                          <ZAxis type="number" dataKey="z" range={[60, 300]} />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                          <Scatter
                            name={t("staffManagement.analysisDepartment")}
                            data={riskScatterData}
                            fill="var(--color-info)"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {t("staffManagement.analysisIssuerConsistency")}
                  </Typography>
                  <Box sx={{ width: "100%", height: 230 }}>
                    <ResponsiveContainer>
                      <BarChart data={issuerConsistencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="issuer" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="var(--color-secondary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {ENABLE_DEPARTMENT_ANALYSIS ? (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  {t("staffManagement.analysisRiskTableTitle")}
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {t("staffManagement.analysisDepartment")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.analysisTeamSize")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.analysisDemeritCount")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.analysisNetScore")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.analysisDemeritRate")}
                        </TableCell>
                        <TableCell align="right">
                          {t("staffManagement.analysisTrendVsPrevious")}
                        </TableCell>
                        <TableCell>
                          {t("staffManagement.analysisRiskLevel")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {departmentRiskRows.map((row) => (
                        <TableRow key={row.department}>
                          <TableCell>{row.department || "-"}</TableCell>
                          <TableCell align="right">{row.teamSize}</TableCell>
                          <TableCell align="right">
                            {row.demeritCount}
                          </TableCell>
                          <TableCell align="right">{row.netScore}</TableCell>
                          <TableCell align="right">
                            {row.demeritRate.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {row.trendVsPrevious.toFixed(2)}
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
          ) : null}
        </>
      )}
    </Box>
  );
};

export default StaffMeritProfileAnalysis;
