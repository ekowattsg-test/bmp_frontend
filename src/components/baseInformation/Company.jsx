import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { ListContainer, useCRUDState } from "../common";
import HelpDialog from "../common/HelpDialog";
import CompanyAdd from "./CompanyAdd";
import CompanyEdit from "./CompanyEdit";
import CompanyDelete from "./CompanyDelete";

const Company = () => {
  const [refresh, setRefresh] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const { t } = useTranslation();
  const {
    action,
    setAction,
    selectedItem,
    setSelectedItem,
    handleEdit,
    handleCancel,
  } = useCRUDState();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    request("GET", "/api/companies")
      .then((response) => {
        setCompanyData(response.data);
      })
      .catch(() => {
        setCompanyData(null);
      });
    setRefresh(false);
  }, [refresh]);

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleDeleteCompany = () => {
    setDeleteMode(false);
    setSelectedForDelete(null);
    setRefresh(true);
  };

  if (deleteMode && selectedForDelete) {
    return (
      <CompanyDelete
        company={selectedForDelete}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedForDelete(null);
        }}
        onDeleted={handleDeleteCompany}
      />
    );
  }

  if (action === "edit" && selectedItem) {
    return (
      <CompanyEdit
        company={selectedItem}
        onCancel={(edited) => {
          handleCancel();
          if (edited) setRefresh(true);
        }}
      />
    );
  }

  if (showAdd) {
    return <CompanyAdd onCancel={handleAddCancel} />;
  }

  return (
    <div>
      <ListContainer
        title={t("companyList.title")}
        subtitle={t("companyList.subtitle", "Manage companies")}
        onHelpClick={() => setHelpOpen(true)}
        searchPlaceholder={t(
          "companyList.searchPlaceholder",
          "Search companies...",
        )}
        data={companyData || []}
        columns={["companyId", "companyName", "showCompany", "active"]}
        t={t}
        onAdd={() => setShowAdd(true)}
        onEdit={handleEdit}
        onDelete={(company) => {
          setSelectedForDelete(company);
          setDeleteMode(true);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage={t("messages.noCompanies", "No companies found.")}
      />
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("companyList.helpTitle", "Company help")}
        content={t(
          "companyList.helpBody",
          "This page lists companies. Use Add to create a new company. Use Edit or Delete to modify existing records.",
        )}
      />
    </div>
  );
};

export default Company;
