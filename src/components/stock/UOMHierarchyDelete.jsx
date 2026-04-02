import React, { useState } from "react";
import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { FormActions } from "../common/CRUDActions";
import { Box, Typography } from "@mui/material";

const UOMHierarchyDelete = ({ item, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const parentLabel =
    item.parentProductName ||
    item.parentProductCode ||
    String(item.parentProductId || "");
  const childLabel =
    item.childProductName ||
    item.childProductCode ||
    String(item.childProductId || "");

  const handleDelete = () => {
    setLoading(true);
    request("DELETE", `/api/producthierarchies/${item.hierarchyId}`)
      .then(() => onSuccess())
      .catch((err) => {
        console.error("Error deleting UOM hierarchy:", err);
        setLoading(false);
      });
  };

  return (
    <Modal open={true} onClose={onClose} title={t("uomHierarchy.delete")}>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ mb: 1 }}>
          {t("uomHierarchy.deleteConfirm")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {t("uomHierarchy.parentProduct")}: <strong>{parentLabel}</strong>
          {" → "}
          {t("uomHierarchy.childProduct")}: <strong>{childLabel}</strong>
          {" × "}
          {item.numberOfChildren}
        </Typography>
        <FormActions
          loading={loading}
          onCancel={onClose}
          onSubmit={handleDelete}
          submitLabel={t("basic.delete")}
          cancelLabel={t("basic.cancel")}
        />
      </Box>
    </Modal>
  );
};

export default UOMHierarchyDelete;
