import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { request } from "../../../helpers/axios_helper";
import { getPdaStaffId } from "../common/pda_user_helper";

/** Status colours mapped to MUI Chip colours */
const STATUS_COLOR = {
  OPEN: "default",
  ISSUED: "info",
  INPROGRESS: "warning",
  CLOSED: "success",
  CANCELLED: "error",
};

/**
 * PdaWorkOrderList
 *
 * Fetches all work orders and filters to the ones assigned to the
 * currently logged-in PDA user (matched by mobileNumber stored in
 * pda_user_info).  Shows ISSUED and INPROGRESS orders by default.
 */
export default function PdaWorkOrderList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const staffId = useMemo(() => getPdaStaffId(), []);

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0); // all WOs from API (for diagnostics)
  const [allOrders, setAllOrders] = useState([]); // raw API data for diagnostics
  const [typeMap, setTypeMap] = useState({}); // workOrderType code → WorkOrderType entity
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      request("GET", "/api/workorders"),
      request("GET", "/api/workordertypes"),
    ])
      .then(([woRes, typesRes]) => {
        const all = woRes.data || [];
        setTotalCount(all.length);
        setAllOrders(all);
        const map = {};
        (typesRes.data || []).forEach((type) => {
          map[type.workOrderType] = type;
        });
        setTypeMap(map);
        // Show only orders assigned to this staff and that are actionable
        const mine = all.filter(
          (wo) =>
            wo.workBy === staffId &&
            (wo.workOrderStatus === "ISSUED" ||
              wo.workOrderStatus === "INPROGRESS"),
        );
        setOrders(mine);
      })
      .catch(() => setError(t("pda.workorder.list.loadError")))
      .finally(() => setLoading(false));
  }, [staffId, t]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <Box sx={{ textAlign: "center", mt: 8, color: "text.secondary" }}>
        <AssignmentIcon sx={{ fontSize: 56, opacity: 0.3, mb: 2 }} />
        <Typography variant="body1" gutterBottom>
          {t("pda.workorder.list.empty")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {orders.map((wo) => (
        <Card key={wo.workOrderId} variant="outlined">
          <CardActionArea
            onClick={() =>
              navigate(`/pda/orders/${wo.workOrderId}`, {
                state: { title: wo.workOrderId },
              })
            }
          >
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              {/* outer row: text block + chevron */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  {/* Line 1: WO number · type description */}
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: 700, mb: 0.3 }}
                  >
                    {wo.workOrderId}
                    {(typeMap[wo.workOrderType]?.workOrderDescription ||
                      wo.workOrderType) && (
                      <Box
                        component="span"
                        sx={{
                          fontWeight: 400,
                          color: "text.secondary",
                          fontSize: "0.75rem",
                          ml: 0.75,
                        }}
                      >
                        {"\u00b7"}&nbsp;
                        {typeMap[wo.workOrderType]?.workOrderDescription ||
                          wo.workOrderType}
                      </Box>
                    )}
                  </Typography>

                  {/* Line 2: description (left) + status chip (right) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {wo.workDescription || "—"}
                    </Typography>
                    <Chip
                      label={t(
                        `pda.workorder.status.${wo.workOrderStatus}`,
                        wo.workOrderStatus,
                      )}
                      size="small"
                      color={STATUS_COLOR[wo.workOrderStatus] ?? "default"}
                    />
                  </div>
                </div>

                <ChevronRightIcon
                  sx={{ color: "text.disabled", flexShrink: 0, fontSize: 20 }}
                />
              </div>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}

      <Divider sx={{ mt: 1 }} />
      <Typography variant="caption" color="text.secondary" textAlign="center">
        {t("pda.workorder.list.count", { count: orders.length })}
      </Typography>
    </Box>
  );
}
