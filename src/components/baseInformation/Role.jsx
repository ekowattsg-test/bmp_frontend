import React, { useState, useEffect } from "react";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Paper,
} from "@mui/material";
import { request } from "../../helpers/axios_helper";
import RoleAdd from "./RoleAdd";
import RoleEdit from "./RoleEdit";
import RoleDelete from "./RoleDelete";
import SearchIcon from "@mui/icons-material/Search";
import HelpDialog from "../common/HelpDialog";
import { HeaderBar } from "../common";

const Role = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [roleData, setRoleData] = useState([]);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    request("GET", "/api/roles")
      .then((response) => {
        setRoleData(response.data);
      })
      .catch(() => {
        setRoleData([]);
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
      {deleteMode && selectedRole ? (
        <RoleDelete
          role={selectedRole}
          onCancel={() => setDeleteMode(false)}
          onDeleted={() => {
            setDeleteMode(false);
            setRefresh(true);
          }}
        />
      ) : action === "edit" && selectedRole ? (
        <RoleEdit role={selectedRole} onCancel={handleEditCancel} />
      ) : (
        <div>
          {!showAdd && (
            <HeaderBar
              title={t("roleList.title", "Role List")}
              subtitle={t(
                "roleList.subtitle",
                "Manage user roles and permissions",
              )}
              onHelp={() => setHelpOpen(true)}
              actions={
                <>
                  <TextField
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("roleList.searchPlaceholder", "Search...")}
                    size="small"
                    sx={{ minWidth: { xs: 160, sm: 220 } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton tabIndex={-1}>
                            <SearchIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <IconButton
                    color="primary"
                    aria-label="add role"
                    onClick={() => setShowAdd(true)}
                  >
                    <AddIcon />
                  </IconButton>
                </>
              }
            />
          )}
          {showAdd ? (
            <RoleAdd onCancel={handleAddCancel} />
          ) : roleData && Array.isArray(roleData) && roleData.length > 0 ? (
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
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {t("roleList.role")}
                    </th>
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {t("roleList.description")}
                    </th>
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {t("roleList.menu")}
                    </th>
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "center",
                      }}
                    >
                      {t("roleList.level")}
                    </th>
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "center",
                      }}
                    >
                      {/* Actions column */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roleData
                    .filter((r) => {
                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        r.role?.toLowerCase().includes(q) ||
                        r.description?.toLowerCase().includes(q) ||
                        r.menu?.toLowerCase().includes(q) ||
                        (typeof r.level === "number" &&
                          r.level.toString().includes(q))
                      );
                    })
                    .map((r, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          setSelectedRole(r);
                          setAction("edit");
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
                            textAlign: "left",
                          }}
                        >
                          {r.role}
                        </td>
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
                            textAlign: "left",
                          }}
                        >
                          {r.description}
                        </td>
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
                            textAlign: "left",
                          }}
                        >
                          {r.menu || ""}
                        </td>
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
                            textAlign: "center",
                          }}
                        >
                          {r.level}
                        </td>
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
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
                              setSelectedRole(r);
                              setDeleteMode(true);
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                fontSize: {
                                  xs: "clamp(1.1rem, 3vw, 1.5rem)",
                                  md: "1.5rem",
                                },
                              }}
                            >
                              <DeleteIcon
                                sx={{
                                  fontSize: {
                                    xs: "clamp(1.1rem, 3vw, 1.5rem)",
                                    md: "1.5rem",
                                  },
                                }}
                              />
                            </Box>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>No roles found.</div>
          )}
        </div>
      )}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("roleList.helpTitle", "Role help")}
        content={t(
          "roleList.helpBody",
          "This page manages roles. Use Add to create a role, Edit to modify, and Delete to remove roles.",
        )}
      />
    </div>
  );
};
export default Role;
