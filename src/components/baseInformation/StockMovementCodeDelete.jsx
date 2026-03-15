import React, { useState } from "react";
import Modal from "../common/Modal";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { FormActions } from "../common/CRUDActions";
import { Box } from "@mui/material";

const StockMovementCodeDelete = ({ item, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    setLoading(true);
    request("DELETE", `/api/stockmovementcodes/${item.movementType}`)
      .then(() => onSuccess())
      .catch((err) => {
        console.error("Error deleting stock movement code:", err);
        setLoading(false);
      });
  };

  return (
    <Modal open={true} onClose={onClose} title={t("stockMovementCode.delete")}>
      <Box sx={{ padding: 2 }}>
        <div>
          {t("stockMovementCode.deleteConfirm", { code: item.movementType })}
        </div>
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

export default StockMovementCodeDelete;
// Cleared for clean re-implementation
