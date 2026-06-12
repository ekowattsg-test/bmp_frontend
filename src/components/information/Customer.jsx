import React, { useState, useEffect } from "react";
import { Delete } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/Add";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { request } from "../../helpers/axios_helper";
import CustomerAdd from "./CustomerAdd";
import CustomerEdit from "./CustomerEdit";
import CustomerDelete from "./CustomerDelete";
import HelpDialog from "../common/HelpDialog";
import { HeaderBar } from "../common";

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
            <HeaderBar
              title={t("customerList.title")}
              subtitle={t("customerList.subtitle", "Manage customers")}
              onHelp={() => setHelpOpen(true)}
              actions={
                <>
                  <TextField
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t(
                      "customerList.searchPlaceholder",
                      "Search...",
                    )}
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
                  {enableActions && (
                    <IconButton
                      color="primary"
                      aria-label={t("customerList.addTitle", "Add customer")}
                      onClick={() => setShowAdd(true)}
                    >
                      <AddIcon />
                    </IconButton>
                  )}
                </>
              }
            />
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
                        {t(`customerList.${key}`)}
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
