import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LanguageIcon from "@mui/icons-material/Language";
import { request, setAuthHeader } from "../../../helpers/axios_helper";
import { getPdaDisplayName } from "../common/pda_user_helper";
import PdaBottomNav from "./PdaBottomNav";

// Tab root paths — no back button shown on these
const TAB_ROOTS = ["/pda/stockcard", "/pda/briefing", "/pda/me"];

/**
 * PdaLayout — mobile shell for all /pda/* routes (except /pda/login).
 *
 * On mount: if pda_user_info lacks staffId, resolves it via
 * GET /api/staffs/mobile/{mobileNumber} and merges the result into
 * localStorage so all PDA components can read both mobileNumber
 * (used by WorkOrder.workBy) and staffId (used by WorkOrderData.staffId).
 *
 * Renders:
 *   - Fixed AppBar (with back button on sub-pages, user name on right)
 *   - Scrollable content area
 *   - Fixed bottom navigation (Orders | Inventory Card | Me)
 */
export default function PdaLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [enriched, setEnriched] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [langMenuAnchorEl, setLangMenuAnchorEl] = useState(null);

  const currentLang = useMemo(() => {
    const value = String(i18n.resolvedLanguage || i18n.language || "en")
      .trim()
      .toLowerCase();
    return value.startsWith("zh") ? "zh" : "en";
  }, [i18n.language, i18n.resolvedLanguage]);

  const openLanguageMenu = (event) => {
    setLangMenuAnchorEl(event.currentTarget);
  };

  const closeLanguageMenu = () => {
    setLangMenuAnchorEl(null);
  };

  const changeLanguage = async (lang) => {
    closeLanguageMenu();
    if (!lang || lang === currentLang) return;
    await i18n.changeLanguage(lang);
  };

  // Hide back button on the three tab root pages
  const isTabRoot = TAB_ROOTS.includes(location.pathname);

  const isInventoryRoute =
    location.pathname.startsWith("/pda/stockcard") ||
    location.pathname.startsWith("/pda/receive-po-stock") ||
    location.pathname.startsWith("/pda/stock-issue") ||
    location.pathname.startsWith("/pda/stock-transfer-out") ||
    location.pathname.startsWith("/pda/stock-transfer-in") ||
    location.pathname.startsWith("/pda/stock-return") ||
    location.pathname.startsWith("/pda/transfer-return-in") ||
    location.pathname.startsWith("/pda/purchase-return") ||
    location.pathname.startsWith("/pda/asset-assignment") ||
    location.pathname.startsWith("/pda/asset-return") ||
    location.pathname.startsWith("/pda/stock-disposal");

  const pageTitle =
    location.state?.title ??
    (isInventoryRoute
      ? t("pda.nav.stockCard", t("menu.stockCard", "Inventory"))
      : t("pda.layout.title"));

  // ── Session expired: fired by axios_helper when PDA token is rejected ───
  useEffect(() => {
    const handler = () => setSessionExpired(true);
    window.addEventListener("pda:auth:expired", handler);
    return () => window.removeEventListener("pda:auth:expired", handler);
  }, []);

  // ── Bridge: mobileNumber ↔ staffId ──────────────────────────────────────
  // WorkOrder.workBy uses mobileNumber; WorkOrderData.staffId uses staffId.
  // Resolve staffId once from /api/staffs/mobile/{mobileNumber} and cache it.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pda_user_info");
      if (!stored) return;
      const user = JSON.parse(stored);
      if (user.staffId) {
        setEnriched(true);
        return;
      }
      const mobile = user.mobileNumber;
      if (!mobile) {
        setEnriched(true);
        return;
      }
      request("GET", `/api/staffs/mobile/${mobile}`)
        .then((res) => {
          const staff = res.data;
          const merged = {
            ...user,
            staffId: staff.staffId,
            staffName: staff.staffName,
            mobileNumber: staff.mobileNumber,
          };
          localStorage.setItem("pda_user_info", JSON.stringify(merged));
        })
        .catch(() => {
          // Non-fatal — app continues; staffId will be empty when needed
        })
        .finally(() => setEnriched(true));
    } catch {
      setEnriched(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const userName = useMemo(
    () => getPdaDisplayName(),
    [enriched], // re-read after enrichment writes staffName to localStorage
  );

  const clearAccessibleCookies = () => {
    if (typeof document === "undefined") return;
    const raw = document.cookie;
    if (!raw) return;
    raw.split(";").forEach((part) => {
      const name = part.split("=")[0]?.trim();
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/pda`;
    });
  };

  const clearPdaSessionAndGoLogin = async () => {
    setAuthHeader(null);
    localStorage.removeItem("pda_user_info");
    localStorage.removeItem("user_info");
    clearAccessibleCookies();

    // Best-effort server-side cookie/session cleanup.
    await Promise.allSettled([
      request("POST", "/auth/logout", null, { skipAuthRedirect: true }),
      request("POST", "/api/mobile-logins/logout", null, {
        skipAuthRedirect: true,
      }),
    ]);

    setSessionExpired(false);
    if (typeof window !== "undefined") {
      window.location.href = window.location.origin;
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      {/* Session-expired overlay — shown when token is rejected by backend */}
      {sessionExpired && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            p: 3,
            gap: 2,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 56, color: "warning.main" }} />
          <Typography variant="h6" fontWeight={600} textAlign="center">
            {t("pda.session.expired", "Session Expired")}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t(
              "pda.session.expiredHint",
              "Please scan the QR code again to continue.",
            )}
          </Typography>
          <Button variant="contained" onClick={clearPdaSessionAndGoLogin}>
            {t("pda.session.dismiss", "Dismiss")}
          </Button>
        </Box>
      )}
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar sx={{ gap: 1 }}>
          {!isTabRoot && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label={t("pda.layout.back")}
              onClick={() => navigate(-1)}
              size="large"
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }} noWrap>
            {pageTitle}
          </Typography>

          <IconButton
            color="inherit"
            aria-label={t("pda.layout.language", "Change language")}
            onClick={openLanguageMenu}
            size="large"
          >
            <LanguageIcon />
          </IconButton>

          <Menu
            anchorEl={langMenuAnchorEl}
            open={Boolean(langMenuAnchorEl)}
            onClose={closeLanguageMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem
              selected={currentLang === "en"}
              onClick={() => changeLanguage("en")}
            >
              English
            </MenuItem>
            <MenuItem
              selected={currentLang === "zh"}
              onClick={() => changeLanguage("zh")}
            >
              中文
            </MenuItem>
          </Menu>

          {userName && (
            <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>
              {userName}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* Offset for fixed AppBar */}
      <Toolbar />

      {/* Extra bottom padding so content clears the fixed bottom nav (56px) */}
      <Box component="main" sx={{ p: 2, pb: 10 }}>
        {enriched ? (
          <Outlet />
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      <PdaBottomNav />
    </Box>
  );
}
