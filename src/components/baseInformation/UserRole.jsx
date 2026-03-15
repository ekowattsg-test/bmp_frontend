import React, { useState, useEffect, useContext } from "react";
import { Add as AddIcon, Delete as DeleteIcon, HelpOutline as HelpOutlineIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { Box, TextField, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import UserRoleAdd from "./UserRoleAdd";
import UserRoleEdit from "./UserRoleEdit";
import UserRoleDelete from "./UserRoleDelete";
import HelpDialog from "../common/HelpDialog";

const UserRole = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [userRoleData, setUserRoleData] = useState(null);
  const [selectedUserRole, setSelectedUserRole] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    request("GET", "/api/userroleviews")
      .then((response) => {
        setUserRoleData(response.data);
      })
      .catch(() => {
        setUserRoleData(null);
      });
    request("GET", "/api/roles")
      .then((response) => {
        setRoles(response.data);
      })
      .catch(() => setRoles([]));
    request("GET", "/api/users")
      .then((response) => {
        setUsers(response.data);
      })
      .catch(() => setUsers([]));
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
      {deleteMode && selectedUserRole ? (
        <UserRoleDelete
          userRole={selectedUserRole}
          users={users}
          roles={roles}
          onCancel={() => setDeleteMode(false)}
          onDeleted={() => {
            setDeleteMode(false);
            setRefresh(true);
          }}
        />
      ) : action === "edit" && selectedUserRole ? (
        <UserRoleEdit userRole={selectedUserRole} onCancel={handleEditCancel} />
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0 }}>{t("userRole.title", "User-Role Mapping")}</h2>
                    <div style={{ color: "var(--color-text-secondary)" }}>
                      {t("userRole.subtitle", "Assign roles to users")}
                    </div>
                    <IconButton
                      size="small"
                      aria-label="help"
                      onClick={() => setHelpOpen(true)}
                      tabIndex={0}
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </div>
              </div>
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("userRole.searchPlaceholder", "Search...")}
                size="small"
                style={{ marginLeft: 16, minWidth: 220 }}
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
              <div style={{ flex: 1 }} />
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
                  aria-label="add userrole"
                  onClick={() => setShowAdd(true)}
                  style={{ marginLeft: 16 }}
                >
                  <AddIcon />
                </IconButton>
              </div>
            </div>
          )}
          {showAdd ? (
            <UserRoleAdd onCancel={handleAddCancel} />
          ) : userRoleData &&
            Array.isArray(userRoleData) &&
            userRoleData.length > 0 ? (
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
                    {/* Hide ID column if not needed, otherwise comment out next line */}
                    {/* <th style={{ border: "1px solid var(--color-gray-300)", padding: "8px", textAlign: "left" }}>{t("userRole.id", "ID")}</th> */}
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {t("userRole.user_id", "User")}
                    </th>
                    <th
                      style={{
                        border: "1px solid var(--color-gray-300)",
                        padding: "8px",
                        textAlign: "left",
                      }}
                    >
                      {t("userRole.role_id", "Role")}
                    </th>
                    {/* ...existing code... */}
                  </tr>
                </thead>
                <tbody>
                  {userRoleData
                    .filter((ur) => {
                      // Only show user-role pairs where both the role.level and the user's level
                      // are defined and less than or equal to the current user's level.
                      const role = roles.find((r) => r.id === ur.role_id);
                      const user = users.find((u) => u.id === ur.user_id);
                      const userLevel = userInfo?.level || 0;

                      if (
                        !role ||
                        typeof role.level !== "number" ||
                        role.level > userLevel
                      ) {
                        return false;
                      }

                      if (
                        !user ||
                        typeof user.level !== "number" ||
                        user.level > userLevel
                      ) {
                        return false;
                      }

                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (role &&
                          role.description &&
                          role.description.toLowerCase().includes(q)) ||
                        `${user.lastName} ${user.firstName}`
                          .toLowerCase()
                          .includes(q)
                      );
                    })
                    .map((ur, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          setSelectedUserRole(ur);
                          setAction("edit");
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {/* Hide ID cell if not needed, otherwise comment out next line */}
                        {/* <td style={{ border: "1px solid var(--color-gray-200)", padding: "8px", textAlign: "left" }}>{ur.id}</td> */}
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
                            textAlign: "left",
                          }}
                        >
                          {(() => {
                            const user = users.find((u) => u.id === ur.user_id);
                            return user
                              ? `${user.lastName} ${user.firstName}`
                              : ur.user_id;
                          })()}
                        </td>
                        <td
                          style={{
                            border: "1px solid var(--color-gray-200)",
                            padding: "8px",
                            textAlign: "left",
                          }}
                        >
                          {(() => {
                            const role = roles.find((r) => r.id === ur.role_id);
                            return role ? role.description : ur.role_id;
                          })()}
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
                              setSelectedUserRole(ur);
                              setDeleteMode(true);
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <DeleteIcon />
                            </Box>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              {t("userRole.noMappings", "No user-role mappings found.")}
            </div>
          )}
        </div>
      )}
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("userRole.helpTitle", "User role help")}
        content={t(
          "userRole.helpBody",
          "This page assigns roles to users. Use Add to create a mapping, Edit to modify, and Delete to remove a mapping."
        )}
      />
    </div>
  );
};

export default UserRole;
