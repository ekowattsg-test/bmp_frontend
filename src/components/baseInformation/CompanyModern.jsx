import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  BlockListItem,
  LoadMoreBlockList,
} from "../common";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import HelpDialog from "../common/HelpDialog";
import CompanyAdd from "./CompanyAdd";
import CompanyEdit from "./CompanyEdit";
import CompanyDelete from "./CompanyDelete";

const CompanyModern = () => {
  const [action, setAction] = useState("view");
  const [refresh, setRefresh] = useState(false);
  const [companyData, setCompanyData] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const [helpOpen, setHelpOpen] = useState(false);

  const getLanguageLabel = (language) => {
    const code = String(language || "").trim();
    return code ? t(`languages.${code}`, code) : "-";
  };

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/companies")
      .then((response) => {
        setCompanyData(response.data || []);
      })
      .catch(() => {
        setCompanyData([]);
      })
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  const handleEditCancel = (edited) => {
    setAction("view");
    setSelectedCompany(null);
    if (edited) setRefresh(true);
  };

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setAction("edit");
  };

  const handleDelete = (company) => {
    setSelectedCompany(company);
    setDeleteMode(true);
  };

  const filteredCompanies = companyData.filter((company) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const searchableText = [
      company.companyId,
      company.companyName,
      company.biZCode,
      company.addressLine1,
      company.addressLine2,
      company.postalCode,
      company.city,
      company.language,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return (
      searchableText.includes(searchLower)
    );
  });

  const columns = [
    {
      field: "companyId",
      headerName: t("companyList.companyId", "Company ID"),
      width: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "companyName",
      headerName: t("companyList.companyName", "Company Name"),
      flex: 1,
      minWidth: 250,
    },
    {
      field: "biZCode",
      headerName: t("companyList.biZCode", "Business Code"),
      width: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "city",
      headerName: t("companyList.city", "City"),
      width: 140,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "language",
      headerName: t("companyList.language", "Language"),
      width: 140,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => getLanguageLabel(params.value),
    },
    {
      field: "showCompany",
      headerName: t("companyList.showCompany", "Show Company"),
      width: 140,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.value ? t("basic.true", "Yes") : t("basic.false", "No")}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "active",
      headerName: t("companyList.active", "Active"),
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.value ? t("basic.true", "Yes") : t("basic.false", "No")}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: t("basic.actions", "Actions"),
      width: 120,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleEdit(params.row)}
            title={t("basic.edit", "Edit")}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            title={t("basic.delete", "Delete")}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <LoadingState
        message={t("companyList.loading", "Loading companies...")}
      />
    );
  }

  if (deleteMode && selectedCompany) {
    return (
      <CompanyDelete
        company={selectedCompany}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedCompany(null);
        }}
        onDeleted={() => {
          setDeleteMode(false);
          setSelectedCompany(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (action === "edit" && selectedCompany) {
    return (
      <CompanyEdit company={selectedCompany} onCancel={handleEditCancel} />
    );
  }

  if (showAdd) {
    return <CompanyAdd onCancel={handleAddCancel} />;
  }

  const blockColumnDefs = columns
    .filter((c) => c.field !== "actions")
    .map((c) => ({ field: c.field, label: c.headerName }));

  return (
    <Box>
      <PageHeader
        title={t("companyList.title", "Company Management")}
        subtitle={t("companyList.subtitle", "Manage companies in the system")}
        onHelpClick={() => setHelpOpen(true)}
        icon={BusinessIcon}
        actionLabel={t("companyList.addTitle", "Add Company")}
        onActionClick={() => setShowAdd(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("companyList.helpTitle", "Company help")}
        content={t(
          "companyList.helpBody",
          "This page lists companies. Use Add to create a new company. Use Edit or Delete to modify existing records. Company records now include business code, address, postal code, city, language, visibility, and active status.",
        )}
      />

      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            "companyList.searchPlaceholder",
            "Search companies...",
          )}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {filteredCompanies.length === 0 && !loading ? (
        <EmptyState
          title={t("companyList.noCompanies", "No companies found")}
          description={
            search
              ? t(
                  "companyList.noSearchResults",
                  "Try adjusting your search terms",
                )
              : t(
                  "companyList.noCompaniesDescription",
                  "Get started by adding your first company",
                )
          }
          actionLabel={
            !search ? t("companyList.addTitle", "Add Company") : null
          }
          onActionClick={!search ? () => setShowAdd(true) : null}
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredCompanies}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.companyId || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              leadingMedia={{
                placeholder: (
                  <BusinessIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
              t={t}
            />
          )}
        />
      ) : (
        <Box
          sx={{
            height: 600,
            width: "100%",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={filteredCompanies}
            columns={columns}
            getRowId={(row) => row.companyId}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight={false}
            sx={{
              border: 0,
              "& .MuiDataGrid-cell:focus": { outline: "none" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "grey.50",
                borderRadius: 0,
              },
              "& .MuiDataGrid-footerContainer": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                minHeight: "52px",
                gap: "12px",
              },
              "& .MuiTablePagination-root": {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "16px",
              },
              "& .MuiTablePagination-displayedRows": {
                margin: 0,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              },
              "& .MuiTablePagination-selectLabel": {
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              },
              "& .MuiTablePagination-select": {
                display: "flex",
                alignItems: "center",
              },
              "& .MuiTablePagination-actions": {
                display: "flex",
                alignItems: "center",
                marginLeft: 0,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default CompanyModern;
