import React, { useState, useEffect } from "react";
import { Delete } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  TextField,
  InputAdornment,
  IconButton,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import { request } from "../../helpers/axios_helper";
import VendorAdd from "./VendorAdd";
import VendorEdit from "./VendorEdit";
import VendorDelete from "./VendorDelete";
import HelpDialog from "../common/HelpDialog";

const Vendor = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [vendorData, setVendorData] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const { t } = useTranslation();
  const enableActions = false;
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    request("GET", "/api/vendors")
      .then((response) => {
        setVendorData(response.data);
      })
      .catch(() => {
        setVendorData(null);
      });
    setRefresh(false);
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    if (edited) setRefresh(true);
  };
  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  return (
    <div>
      {deleteMode && selectedVendor ? (
        <VendorDelete
          vendor={selectedVendor}
          onCancel={() => setDeleteMode(false)}
          onDeleted={() => {
            setDeleteMode(false);
            setRefresh(true);
          }}
        />
      ) : action === "edit" && selectedVendor ? (
        <VendorEdit vendor={selectedVendor} onCancel={handleEditCancel} />
      ) : (
        <div>
          {!showAdd && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="h5" component="h2" sx={{ margin: 0 }}>
                  {t("vendorList.title")}
                </Typography>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t("vendorList.subtitle", "Manage vendors")}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="help"
                    onClick={() => setHelpOpen(true)}
                  >
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("vendorList.searchPlaceholder", "Search...")}
                size="small"
                style={{ marginLeft: 16, minWidth: 220 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton tabIndex={-1}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            fontSize: {
                              xs: "clamp(1.2rem, 4vw, 2rem)",
                              md: "2rem",
                            },
                          }}
                        >
                          <SearchIcon
                            sx={{
                              fontSize: {
                                xs: "clamp(1.2rem, 4vw, 2rem)",
                                md: "2rem",
                              },
                            }}
                          />
                        </Box>
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <div style={{ flex: 1 }} />
              {enableActions && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flex: 1,
                  }}
                >
                  <IconButton
                    color="primary"
                    aria-label="add vendor"
                    onClick={() => setShowAdd(true)}
                    style={{ marginLeft: 16 }}
                  >
                    <AddIcon />
                  </IconButton>
                </div>
              )}
            </div>
          )}
          {enableActions && showAdd ? (
            <VendorAdd onCancel={handleAddCancel} />
          ) : vendorData &&
            Array.isArray(vendorData) &&
            vendorData.length > 0 ? (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 400,
                }}
              >
                <thead>
                  <tr>
                    {Object.keys(vendorData[0]).map((key) => (
                      <th
                        key={key}
                        style={{
                          border: "1px solid var(--color-gray-300)",
                          padding: "8px",
                          textAlign: key === "active" ? "center" : undefined,
                        }}
                      >
                        {t("vendorList." + key)}
                      </th>
                    ))}
                    {enableActions && (
                      <th
                        style={{
                          border: "1px solid var(--color-gray-300)",
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        {t("basic.actions")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vendorData
                    .filter((vendor) => {
                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (vendor.vendorId &&
                          vendor.vendorId
                            .toString()
                            .toLowerCase()
                            .includes(q)) ||
                        (vendor.vendorName &&
                          vendor.vendorName.toLowerCase().includes(q)) ||
                        (vendor.contactEmail &&
                          vendor.contactEmail.toLowerCase().includes(q)) ||
                        (typeof vendor.active === "boolean" &&
                          t(`basic.${vendor.active ? "true" : "false"}`)
                            .toLowerCase()
                            .includes(q))
                      );
                    })
                    .map((vendor, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          if (!enableActions) return;
                          setSelectedVendor(vendor);
                          setAction("edit");
                        }}
                        style={{
                          cursor: enableActions ? "pointer" : "default",
                        }}
                      >
                        {Object.keys(vendor).map((key, i) => (
                          <td
                            key={i}
                            style={{
                              border: "1px solid var(--color-gray-200)",
                              padding: "8px",
                              textAlign:
                                key === "active" ? "center" : undefined,
                            }}
                          >
                            {key === "active"
                              ? t(`basic.${vendor[key] ? "true" : "false"}`)
                              : vendor[key]}
                          </td>
                        ))}
                        {enableActions && (
                          <td
                            style={{
                              border: "1px solid var(--color-gray-200)",
                              padding: "8px",
                              whiteSpace: "nowrap",
                              textAlign: "center",
                            }}
                          >
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto",
                              }}
                              title={t("menu.delete", "Delete")}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVendor(vendor);
                                setDeleteMode(true);
                              }}
                            >
                              <Delete fontSize="small" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>{t("vendorList.noVendors", "No vendors found.")}</div>
          )}
          <HelpDialog
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            title={t("vendorList.helpTitle", "Vendor help")}
            content={t(
              "vendorList.helpBody",
              "This page lists vendors. Use Add to create a new vendor. Use Edit or Delete to modify existing records.",
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Vendor;
