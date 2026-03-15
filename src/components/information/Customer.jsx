import React, { useState, useEffect } from "react";
import { Delete } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  TextField,
  InputAdornment,
  IconButton,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { request } from "../../helpers/axios_helper";
import CustomerAdd from "./CustomerAdd";
import CustomerEdit from "./CustomerEdit";
import CustomerDelete from "./CustomerDelete";
import HelpDialog from "../common/HelpDialog";

const Customer = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const { t } = useTranslation();
  const enableActions = false;
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    request("GET", "/api/customers")
      .then((response) => {
        setCustomerData(response.data);
      })
      .catch(() => {
        setCustomerData(null);
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
      {deleteMode && selectedCustomer ? (
        <CustomerDelete
          customer={selectedCustomer}
          onCancel={() => setDeleteMode(false)}
          onDeleted={() => {
            setDeleteMode(false);
            setRefresh(true);
          }}
        />
      ) : action === "edit" && selectedCustomer ? (
        <CustomerEdit customer={selectedCustomer} onCancel={handleEditCancel} />
      ) : (
        <div>
          {!showAdd && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 16,
                gap: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="h5" component="h2" sx={{ margin: 0 }}>
                  {t("customerList.title")}
                </Typography>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t("customerList.subtitle", "Manage customers")}
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
                placeholder={t("customerList.searchPlaceholder", "Search...")}
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
                    aria-label="add customer"
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
            <CustomerAdd onCancel={handleAddCancel} />
          ) : customerData &&
            Array.isArray(customerData) &&
            customerData.length > 0 ? (
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
                    {Object.keys(customerData[0]).map((key) => (
                      <th
                        key={key}
                        style={{
                          border: "1px solid var(--color-gray-300)",
                          padding: "8px",
                          textAlign: key === "active" ? "center" : undefined,
                        }}
                      >
                        {t("customerList." + key)}
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
                  {customerData
                    .filter((customer) => {
                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (customer.customerId &&
                          customer.customerId
                            .toString()
                            .toLowerCase()
                            .includes(q)) ||
                        (customer.customerName &&
                          customer.customerName.toLowerCase().includes(q)) ||
                        (customer.contactEmail &&
                          customer.contactEmail.toLowerCase().includes(q)) ||
                        (typeof customer.active === "boolean" &&
                          t(`basic.${customer.active ? "true" : "false"}`)
                            .toLowerCase()
                            .includes(q))
                      );
                    })
                    .map((customer, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          if (!enableActions) return;
                          setSelectedCustomer(customer);
                          setAction("edit");
                        }}
                        style={{
                          cursor: enableActions ? "pointer" : "default",
                        }}
                      >
                        {Object.keys(customer).map((key, i) => (
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
                              ? t(`basic.${customer[key] ? "true" : "false"}`)
                              : customer[key]}
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
                                setSelectedCustomer(customer);
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
            <div>{t("customerList.noCustomers", "No customers found.")}</div>
          )}
          <HelpDialog
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            title={t("customerList.helpTitle", "Customer help")}
            content={t(
              "customerList.helpBody",
              "This page lists customers. Use Add to create a new customer. Use Edit or Delete to modify existing records.",
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Customer;
