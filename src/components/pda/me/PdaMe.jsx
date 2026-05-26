import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import InventoryIcon from "@mui/icons-material/Inventory";
import { QRCodeSVG } from "qrcode.react";
import { getPdaUser } from "../common/pda_user_helper";
import { signEntity } from "../../../helpers/qr_token_helper";
import { request } from "../../../helpers/axios_helper";

/**
 * PdaMe — profile tab.
 *
 * Shows:
 *   - Staff name and mobile number (from pda_user_info in localStorage)
 *   - Placeholder section for assigned assets (data not yet available)
 */
export default function PdaMe() {
  const { t } = useTranslation();

  const user = useMemo(() => getPdaUser() || {}, []);

  const displayName =
    user.staffName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.login ||
    "—";

  const [qrToken, setQrToken] = useState(null);
  useEffect(() => {
    if (user.staffId) {
      signEntity(user.staffId).then(setQrToken);
    }
  }, [user.staffId]);

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState("");

  useEffect(() => {
    if (!displayName) return;
    setAssetsLoading(true);
    setAssetsError("");
    request("GET", "/api/stockviews")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        // Group by stockId, summing stockMoved for rows at this location
        const map = new Map();
        rows
          .filter((r) => String(r.location || "").trim() === displayName.trim())
          .forEach((r) => {
            const id = String(r.stockId || r.stockCode || "");
            if (!id) return;
            const moved =
              r.stockMoved !== undefined &&
              r.stockMoved !== null &&
              r.stockMoved !== ""
                ? Number(r.stockMoved)
                : Number(r.qty || r.quantity || 0) *
                  Number(r.stockModifier || 0);
            if (map.has(id)) {
              map.get(id).qty += moved;
            } else {
              map.set(id, {
                id,
                stockCode: String(r.stockCode || id),
                productName: String(r.productName || ""),
                uom: String(r.uom || ""),
                qty: moved,
              });
            }
          });
        const result = Array.from(map.values())
          .filter((s) => s.qty > 0)
          .sort((a, b) => a.stockCode.localeCompare(b.stockCode));
        setAssets(result);
      })
      .catch(() => setAssetsError(t("pda.me.assetsError")))
      .finally(() => setAssetsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Profile card */}
      <Card variant="outlined">
        <CardContent
          sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: "primary.main",
              flexShrink: 0,
            }}
          >
            <PersonIcon fontSize="large" />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {displayName}
            </Typography>
            {user.mobileNumber && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PhoneAndroidIcon
                  sx={{ fontSize: 14, color: "text.secondary" }}
                />
                <Typography variant="caption" color="text.secondary">
                  {user.mobileNumber}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* QR code card — staff ID */}
      {user.staffId && (
        <Card variant="outlined">
          <CardContent
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={600}
              color="text.secondary"
            >
              {t("pda.me.staffQr")}
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#fff",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                display: "inline-flex",
              }}
            >
              <QRCodeSVG
                value={qrToken || String(user.staffId)}
                size={160}
                level="M"
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "monospace" }}
            >
              {user.staffId}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Assigned assets */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <InventoryIcon sx={{ color: "text.secondary" }} />
            <Typography variant="subtitle2" fontWeight={600}>
              {t("pda.me.assets")}
            </Typography>
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {assetsLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!assetsLoading && assetsError && (
            <Typography variant="body2" color="error" sx={{ py: 1 }}>
              {assetsError}
            </Typography>
          )}

          {!assetsLoading && !assetsError && assets.length === 0 && (
            <Box sx={{ textAlign: "center", py: 3, color: "text.disabled" }}>
              <InventoryIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">
                {t("pda.me.assetsPlaceholder")}
              </Typography>
            </Box>
          )}

          {!assetsLoading && assets.length > 0 && (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 44px",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  bgcolor: "grey.100",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  {t("pda.me.assetsColProduct")}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    textAlign: "center",
                  }}
                >
                  {t("pda.me.assetsColCode")}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    textAlign: "right",
                  }}
                >
                  {t("pda.me.assetsQty")}
                </Typography>
              </Box>

              {/* Rows */}
              {assets.map((item, idx) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 44px",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderTop: idx === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Typography variant="body2" noWrap>
                    {item.productName || "—"}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 0.75,
                      fontFamily: "monospace",
                      color: "text.secondary",
                      textAlign: "center",
                    }}
                  >
                    {item.stockCode}
                  </Typography>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="primary.main"
                      lineHeight={1.2}
                      component="div"
                    >
                      {item.qty}
                    </Typography>
                    {item.uom && (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        display="block"
                        lineHeight={1.2}
                      >
                        {item.uom}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
