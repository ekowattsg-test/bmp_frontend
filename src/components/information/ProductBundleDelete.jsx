import React, { useState } from "react";
import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { FormActions } from "../common/CRUDActions";
import { Box, Typography, Chip, Stack } from "@mui/material";

const ProductBundleDelete = ({ item, productMap, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const memberNames = (item.bundleMembers || []).map((id) => {
    const p = productMap?.[String(id)];
    return p ? p.productName || String(id) : String(id);
  });

  const handleDelete = () => {
    setLoading(true);
    request("DELETE", `/api/productbundles/${item.bundleId}`)
      .then(() => onSuccess())
      .catch((err) => {
        console.error("Error deleting product bundle:", err);
        setLoading(false);
      });
  };

  return (
    <Modal open={true} onClose={onClose} title={t("productBundle.delete")}>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ mb: 1 }}>
          {t("productBundle.deleteConfirm")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          <strong>{item.bundleCode}</strong> — {item.bundleName}
        </Typography>
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          {memberNames.map((name, i) => (
            <Chip key={i} label={name} size="small" />
          ))}
        </Stack>
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

export default ProductBundleDelete;
