import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../../helpers/axios_helper";
import EntityFormDialog from "./EntityFormDialog";

const getStoreyPayload = (form, blockId, existingNumber) => ({
  projectBlockId: blockId,
  storeyName: String(form.storeyName || "").trim(),
  storeyDescription: String(form.storeyDescription || "").trim(),
  storeyNumber: existingNumber ?? 0,
  status: "ACTIVE",
});

const StoreyManager = ({ block, onSelectStorey, selectedStoreyId }) => {
  const { t } = useTranslation();
  const [storeys, setStoreys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStorey, setEditingStorey] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadStoreys = useCallback(async () => {
    if (!block?.projectBlockId) {
      setStoreys([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await request(
        "GET",
        `/api/projectstoreys/block/${block.projectBlockId}`,
      );
      setStoreys(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setError(
        t("buildingProgress.loadStoreysFailed", "Failed to load storeys."),
      );
      setStoreys([]);
    } finally {
      setLoading(false);
    }
  }, [block, t]);

  useEffect(() => {
    loadStoreys();
  }, [loadStoreys]);

  const handleAdd = () => {
    setEditingStorey(null);
    setDialogOpen(true);
  };

  const handleEdit = (storey) => {
    setEditingStorey(storey);
    setDialogOpen(true);
  };

  const handleDelete = async (storey) => {
    const id = storey?.projectStoreyId;
    if (!id) return;
    if (!window.confirm(t("basic.confirmDelete", "Delete this record?")))
      return;
    try {
      await request("DELETE", `/api/projectstoreys/${id}`);
      await loadStoreys();
      if (String(selectedStoreyId) === String(id)) {
        onSelectStorey(null);
      }
    } catch {
      setError(t("basic.deleteFailed", "Failed to delete."));
    }
  };

  const nextStoreyNumber = () => {
    if (storeys.length === 0) return 1;
    return Math.max(...storeys.map((s) => Number(s.storeyNumber) || 0)) + 1;
  };

  const handleSave = async (form) => {
    if (!block?.projectBlockId) return;
    setSaving(true);
    setError("");
    try {
      const payload = getStoreyPayload(
        form,
        block.projectBlockId,
        editingStorey?.storeyNumber ?? nextStoreyNumber(),
      );
      if (editingStorey?.projectStoreyId) {
        await request(
          "PUT",
          `/api/projectstoreys/${editingStorey.projectStoreyId}`,
          payload,
        );
      } else {
        await request("POST", "/api/projectstoreys", payload);
      }
      setDialogOpen(false);
      await loadStoreys();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("basic.saveFailed", "Failed to save."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!block) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          bgcolor: "var(--color-gray-100)",
          borderRadius: 2,
        }}
      >
        <Typography color="text.secondary">
          {t(
            "buildingProgress.selectBlock",
            "Select a block to manage storeys.",
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {t("buildingProgress.storeys", "Storeys")} -{" "}
          {t("buildingProgress.block", "Block")}: {block.blockName}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={loading}
        >
          {t("basic.add", "Add")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "background.default" }}>
              <TableCell>
                {t("buildingProgress.storeyName", "Storey Name")}
              </TableCell>
              <TableCell>
                {t("buildingProgress.storeyDescription", "Description")}
              </TableCell>
              <TableCell align="center">
                {t("basic.actions", "Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {storeys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ color: "text.secondary" }}
                >
                  {t("buildingProgress.noStoreys", "No storeys defined.")}
                </TableCell>
              </TableRow>
            ) : (
              storeys.map((storey) => (
                <TableRow
                  key={storey.projectStoreyId}
                  selected={
                    String(selectedStoreyId) === String(storey.projectStoreyId)
                  }
                  onClick={() => onSelectStorey(storey)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{storey.storeyName}</TableCell>
                  <TableCell>{storey.storeyDescription}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(storey);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(storey);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        saving={saving}
        error={error}
        title={
          editingStorey
            ? t("buildingProgress.editStorey", "Edit Storey")
            : t("buildingProgress.addStorey", "Add Storey")
        }
        entity={editingStorey}
        fields={[
          {
            key: "storeyName",
            label: t("buildingProgress.storeyName", "Storey Name"),
            required: true,
          },
          {
            key: "storeyDescription",
            label: t("buildingProgress.storeyDescription", "Description"),
            multiline: true,
            rows: 2,
          },
        ]}
      />
    </Box>
  );
};

export default StoreyManager;
