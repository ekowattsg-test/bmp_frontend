import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { hasRole } from "../../helpers/roles_helper";
import { request } from "../../helpers/axios_helper";
import {
  ListContainer,
  DeleteConfirmationDialog,
  useCRUDState,
} from "../common";
import HelpDialog from "../common/HelpDialog";
import UserAdd from "./UserAdd";
import UserEdit from "./UserEdit";
import UserDelete from "./UserDelete";

const User = () => {
  const [refresh, setRefresh] = useState(false);
  const [userData, setUserData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);
  const { t } = useTranslation();
  const { userInfo, roles } = useContext(AuthContext);
  const {
    action,
    setAction,
    selectedItem,
    setSelectedItem,
    handleEdit,
    handleCancel,
  } = useCRUDState();
  const [helpOpen, setHelpOpen] = useState(false);

  const isActiveValue = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    const falseValues = new Set([
      "false",
      "0",
      "no",
      "n",
      "inactive",
      "i",
      "disabled",
      "d",
      "off",
      "f",
    ]);
    if (falseValues.has(normalized)) return false;
    const trueValues = new Set([
      "true",
      "1",
      "yes",
      "y",
      "active",
      "a",
      "enabled",
      "on",
      "t",
    ]);
    if (trueValues.has(normalized)) return true;
    return true;
  };

  const isCompanyActive = (companyId) => {
    if (!companyId) return false;
    const company = companies.find(
      (c) => c.companyId === companyId || c.id === companyId,
    );
    if (!company) return false;
    const rawActive = company.active ?? company.isActive ?? company.activeYn;
    return isActiveValue(rawActive);
  };

  useEffect(() => {
    request("GET", "/api/users")
      .then((response) => {
        setUserData(response.data);
      })
      .catch(() => {
        setUserData(null);
      });
    request("GET", "/api/companies")
      .then((response) => {
        setCompanies(response.data);
      })
      .catch(() => {
        setCompanies([]);
      });
    setRefresh(false);
  }, [refresh]);

  const handleAddCancel = (added) => {
    setShowAdd(false);
    if (added) setRefresh(true);
  };

  const handleDeleteUser = () => {
    setDeleteMode(false);
    setSelectedForDelete(null);
    setRefresh(true);
  };

  const filterFunction = (user) => {
    if (!isCompanyActive(user.companyId)) return false;
    if (!hasRole("BaseSetup", roles)) {
      if (
        user.companyId !== userInfo.companyId ||
        (typeof user.level === "number" && user.level > userInfo.level)
      ) {
        return false;
      }
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (user.firstName && user.firstName.toLowerCase().includes(q)) ||
      (user.lastName && user.lastName.toLowerCase().includes(q)) ||
      (user.login && user.login.toLowerCase().includes(q)) ||
      (user.companyId &&
        (() => {
          const company = companies.find((c) => c.companyId === user.companyId);
          return (
            (company &&
              company.companyName &&
              company.companyName.toLowerCase().includes(q)) ||
            user.companyId.toLowerCase().includes(q)
          );
        })()) ||
      (typeof user.active === "boolean" &&
        t(`basic.${user.active ? "true" : "false"}`)
          .toLowerCase()
          .includes(q))
    );
  };

  if (deleteMode && selectedForDelete) {
    return (
      <UserDelete
        user={selectedForDelete}
        onCancel={() => {
          setDeleteMode(false);
          setSelectedForDelete(null);
        }}
        onDeleted={handleDeleteUser}
      />
    );
  }

  if (action === "edit" && selectedItem) {
    return (
      <UserEdit
        user={selectedItem}
        onCancel={(edited) => {
          handleCancel();
          if (edited) setRefresh(true);
        }}
      />
    );
  }

  if (showAdd) {
    return <UserAdd onCancel={handleAddCancel} />;
  }

  return (
    <div>
      <ListContainer
        title={t("userList.title")}
        subtitle={t(
          "userList.subtitle",
          "Manage system users and their access",
        )}
        onHelpClick={() => setHelpOpen(true)}
        searchPlaceholder={t("userList.searchPlaceholder", "Search users...")}
        data={userData || []}
        columns={["firstName", "lastName", "login", "companyId", "level"]}
        t={t}
        onAdd={() => setShowAdd(true)}
        onEdit={handleEdit}
        onDelete={(user) => {
          setSelectedForDelete(user);
          setDeleteMode(true);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        filterFunction={filterFunction}
        emptyMessage={t("messages.noUsers", "No users found.")}
      />
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("userList.helpTitle", "User help")}
        content={t(
          "userList.helpBody",
          "This page manages system users. Use Add to create a new user, Edit to modify user details, and Delete to remove users.",
        )}
      />
    </div>
  );
};

export default User;
