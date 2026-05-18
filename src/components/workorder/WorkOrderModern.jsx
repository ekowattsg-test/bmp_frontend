import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
} from "react";
import {
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ListAlt as ListAltIcon,
  FormatListNumbered as StepsIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import { AuthContext } from "../../context/authContext";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  BlockListItem,
  LoadMoreBlockList,
} from "../common";
import HelpDialog from "../common/HelpDialog";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import WorkOrderForm from "./WorkOrderForm";
import WorkOrderDataForm from "./WorkOrderDataForm";
import WorkOrderStepsForm from "./WorkOrderStepsForm";
import WorkOrderIssueDialog from "./WorkOrderIssueDialog";

const ALL_TYPES = "__ALL__";

const WorkOrderModern = () => {
  const { t } = useTranslation();
  const { shouldUseBlockLayout } = useResponsiveLayout();
  const { userInfo } = useContext(AuthContext);
  const userLevel = userInfo?.level ?? 0;

  const [rows, setRows] = useState([]);
  const [workOrderTypes, setWorkOrderTypes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [helpOpen, setHelpOpen] = useState(false);

  // Add type picker dialog
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  // Currently open form: { mode: "add"|"edit", workOrder: null|{...} }
  const [formState, setFormState] = useState(null);
  // Currently open details screen
  const [dataFormWorkOrder, setDataFormWorkOrder] = useState(null);
  // Currently open steps screen
  const [stepsWorkOrder, setStepsWorkOrder] = useState(null);

  // Issue dialog
  const [issueDialogWorkOrder, setIssueDialogWorkOrder] = useState(null);
  // View-only dialog
  const [viewWorkOrder, setViewWorkOrder] = useState(null);

  // steps/data readiness maps: workOrderId → data
  const [stepsMap, setStepsMap] = useState({}); // id → array of step objects
  const [dataItemsMap, setDataItemsMap] = useState({}); // id → array of data items
  // track which templates were loaded: workOrderType → [{stepNumber, fromEntity, toEntity, stepDescription}]
  const [stepTemplateMap, setStepTemplateMap] = useState({});

  useEffect(() => {
    request("GET", "/api/workordertypes")
      .then((res) =>
        setWorkOrderTypes((res.data || []).filter((wt) => wt.active === 1)),
      )
      .catch(() => setWorkOrderTypes([]));
    request("GET", "/api/staffs")
      .then((res) => setStaffList(res.data || []))
      .catch(() => setStaffList([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    request("GET", "/api/workorders")
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => {
        setLoading(false);
        setRefresh(false);
      });
  }, [refresh]);

  // Fetch all steps and workorder-data to build readiness maps
  useEffect(() => {
    Promise.allSettled([
      request("GET", "/api/worksteps"),
      request("GET", "/api/workorder-data"),
      request("GET", "/api/workstepstypes"),
    ]).then(([stepsRes, dataRes, tmplRes]) => {
      if (stepsRes.status === "fulfilled") {
        const map = {};
        (stepsRes.value.data || []).forEach((s) => {
          const id = s.workOrderId;
          if (!map[id]) map[id] = [];
          map[id].push(s);
        });
        setStepsMap(map);
      }
      if (dataRes.status === "fulfilled") {
        const imap = {};
        (dataRes.value.data || []).forEach((d) => {
          const id = d.workOrderId;
          if (!imap[id]) imap[id] = [];
          imap[id].push(d);
        });
        setDataItemsMap(imap);
      }
      if (tmplRes.status === "fulfilled") {
        const tmap = {};
        (tmplRes.value.data || []).forEach((tmpl) => {
          const wt = tmpl.workOrderType;
          if (!tmap[wt]) tmap[wt] = [];
          tmap[wt].push(tmpl);
        });
        setStepTemplateMap(tmap);
      }
    });
  }, [refresh]);

  const handleAddTypeSelected = (type) => {
    setTypePickerOpen(false);
    setFormState({ mode: "add", workOrderType: type, workOrder: null });
  };

  const handleRowClick = useCallback((workOrder) => {
    setFormState({
      mode: "edit",
      workOrderType: workOrder.workOrderType,
      workOrder,
    });
  }, []);

  const handleFormClose = (saved) => {
    setFormState(null);
    if (saved) setRefresh(true);
  };

  const staffMap = useMemo(() => {
    const m = {};
    staffList.forEach((s) => {
      m[s.staffId] = s.staffName;
    });
    return m;
  }, [staffList]);

  const typeNeedsDetailsMap = useMemo(() => {
    const m = {};
    workOrderTypes.forEach((wt) => {
      m[wt.workOrderType] = wt.needDetails === 1;
    });
    return m;
  }, [workOrderTypes]);

  const typeNeedsStepsMap = useMemo(() => {
    const m = {};
    workOrderTypes.forEach((wt) => {
      m[wt.workOrderType] = (wt.numberOfSteps || 0) > 0;
    });
    return m;
  }, [workOrderTypes]);

  /**
   * Returns true when all steps for the work order have
   * fromLocation and toLocation filled (non-worker entities).
   * Worker entities are always pre-filled so we skip them.
   */
  const isStepsReady = useCallback(
    (workOrder) => {
      const steps = stepsMap[workOrder.workOrderId] || [];
      if (!typeNeedsStepsMap[workOrder.workOrderType]) return true; // no steps needed
      if (steps.length === 0) return false;
      const templates = stepTemplateMap[workOrder.workOrderType] || [];
      return steps.every((s) => {
        const tmpl = templates.find((t) => t.stepNumber === s.stepNumber);
        const fromOk =
          tmpl?.fromEntity === "worker" ||
          !!String(s.fromLocation || "").trim();
        const toOk =
          tmpl?.toEntity === "worker" || !!String(s.toLocation || "").trim();
        return fromOk && toOk;
      });
    },
    [stepsMap, stepTemplateMap, typeNeedsStepsMap],
  );

  const isDetailsReady = useCallback(
    (workOrder) => {
      if (!typeNeedsDetailsMap[workOrder.workOrderType]) return true; // no details needed
      return (dataItemsMap[workOrder.workOrderId] || []).length > 0;
    },
    [dataItemsMap, typeNeedsDetailsMap],
  );

  const canIssue = useCallback(
    (workOrder) => {
      if (workOrder.workOrderStatus === "ISSUED") return false;
      return isStepsReady(workOrder) && isDetailsReady(workOrder);
    },
    [isStepsReady, isDetailsReady],
  );

  // Level 2+ can edit any status; others can only edit non-ISSUED
  const canEdit = useCallback(
    (workOrder) => {
      if (workOrder.workOrderStatus === "ISSUED") return userLevel >= 2;
      return true;
    },
    [userLevel],
  );

  /** Enriches steps with template descriptions before passing to dialog */
  const getEnrichedSteps = useCallback(
    (workOrder) => {
      const steps = stepsMap[workOrder.workOrderId] || [];
      const templates = stepTemplateMap[workOrder.workOrderType] || [];
      return steps.map((s) => {
        const tmpl = templates.find((t) => t.stepNumber === s.stepNumber);
        return {
          ...s,
          _description: tmpl?.stepDescription || "",
          _fromEntity: tmpl?.fromEntity || "",
          _toEntity: tmpl?.toEntity || "",
        };
      });
    },
    [stepsMap, stepTemplateMap],
  );

  const filteredRows = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((r) => {
      const assignedName = staffMap[r.workBy] || r.workBy || "";
      const matchType =
        typeFilter === ALL_TYPES || r.workOrderType === typeFilter;
      const matchSearch =
        !s ||
        String(r.workOrderType || "")
          .toLowerCase()
          .includes(s) ||
        String(r.workDescription || "")
          .toLowerCase()
          .includes(s) ||
        String(r.issuedBy || "")
          .toLowerCase()
          .includes(s) ||
        assignedName.toLowerCase().includes(s) ||
        String(r.workOrderStatus || "")
          .toLowerCase()
          .includes(s);
      return matchType && matchSearch;
    });
  }, [rows, search, typeFilter, staffMap]);

  const columns = useMemo(
    () => [
      {
        field: "workOrderId",
        headerName: t("workOrder.workOrderId"),
        width: 80,
      },
      {
        field: "workOrderType",
        headerName: t("workOrder.workOrderType"),
        width: 130,
      },
      {
        field: "workDescription",
        headerName: t("workOrder.workDescription"),
        flex: 1,
        minWidth: 200,
      },
      {
        field: "issuedBy",
        headerName: t("workOrder.issuedBy"),
        width: 130,
      },
      {
        field: "workOrderDate",
        headerName: t("workOrder.workOrderDate"),
        width: 160,
        valueFormatter: (params) => {
          if (!params) return "";
          const d = new Date(params);
          return Number.isFinite(d.getTime())
            ? d.toLocaleString()
            : String(params);
        },
      },
      {
        field: "workBy",
        headerName: t("workOrder.workBy"),
        width: 130,
        valueGetter: (value) => staffMap[value] || value || "",
      },
      {
        field: "workOrderStatus",
        headerName: t("workOrder.workOrderStatus"),
        width: 110,
        renderCell: (params) => (
          <Chip
            label={params.value || ""}
            color={
              params.value === "OPEN"
                ? "warning"
                : params.value === "ISSUED"
                  ? "success"
                  : params.value === "CLOSED"
                    ? "success"
                    : "default"
            }
            size="small"
          />
        ),
      },
      {
        field: "_actions",
        headerName: "",
        width: 180,
        sortable: false,
        filterable: false,
        align: "center",
        renderCell: (params) => {
          const wo = params.row;
          const stepsReady = isStepsReady(wo);
          const detailsReady = isDetailsReady(wo);
          const issuable = canIssue(wo);
          const editable = canEdit(wo);
          return (
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                alignItems: "center",
                height: "100%",
              }}
            >
              {wo.workOrderStatus !== "OPEN" && (
                <IconButton
                  size="small"
                  sx={{ color: "text.secondary" }}
                  onClick={() => setViewWorkOrder(wo)}
                  title={t("basic.view", "View")}
                >
                  <ViewIcon fontSize="small" />
                </IconButton>
              )}
              {editable && (
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleRowClick(wo)}
                  title={t("basic.edit")}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              {typeNeedsDetailsMap[wo.workOrderType] && (
                <IconButton
                  size="small"
                  onClick={() => setDataFormWorkOrder(wo)}
                  title={t("workOrderData.details", "Details")}
                  sx={{ color: detailsReady ? "success.main" : "error.main" }}
                >
                  <ListAltIcon fontSize="small" />
                </IconButton>
              )}
              {typeNeedsStepsMap[wo.workOrderType] && (
                <IconButton
                  size="small"
                  onClick={() => setStepsWorkOrder(wo)}
                  title={t("workOrderSteps.steps", "Steps")}
                  sx={{ color: stepsReady ? "success.main" : "error.main" }}
                >
                  <StepsIcon fontSize="small" />
                </IconButton>
              )}
              {issuable && (
                <IconButton
                  size="small"
                  onClick={() => setIssueDialogWorkOrder(wo)}
                  title={t("workOrder.issue.iconTitle", "Issue")}
                  sx={{ color: "primary.main" }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          );
        },
      },
    ],
    [
      t,
      staffMap,
      handleRowClick,
      typeNeedsDetailsMap,
      typeNeedsStepsMap,
      isStepsReady,
      isDetailsReady,
      canIssue,
      canEdit,
    ],
  );

  if (stepsWorkOrder) {
    return (
      <WorkOrderStepsForm
        workOrder={stepsWorkOrder}
        workOrderTypeObj={
          workOrderTypes.find(
            (wt) => wt.workOrderType === stepsWorkOrder.workOrderType,
          ) || null
        }
        staffList={staffList}
        onClose={() => {
          setStepsWorkOrder(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (dataFormWorkOrder) {
    const dataFormType = workOrderTypes.find(
      (wt) => wt.workOrderType === dataFormWorkOrder.workOrderType,
    );
    return (
      <WorkOrderDataForm
        workOrder={dataFormWorkOrder}
        contentType={dataFormType?.contentType || "stock"}
        staffList={staffList}
        onClose={() => {
          setDataFormWorkOrder(null);
          setRefresh(true);
        }}
      />
    );
  }

  if (formState) {
    return (
      <WorkOrderForm
        mode={formState.mode}
        workOrderType={formState.workOrderType}
        workOrder={formState.workOrder}
        onClose={handleFormClose}
      />
    );
  }

  const blockColumnDefs = columns.map((c) => ({
    field: c.field,
    label: c.headerName,
  }));

  return (
    <Box>
      <PageHeader
        title={t("workOrder.title")}
        subtitle={t("workOrder.subtitle")}
        icon={AssignmentIcon}
        actionLabel={t("workOrder.addTitle")}
        onActionClick={() => setTypePickerOpen(true)}
        onHelpClick={() => setHelpOpen(true)}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("workOrder.helpTitle")}
        content={t("workOrder.helpBody")}
      />

      {/* Filters */}
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
          placeholder={t("workOrder.searchPlaceholder")}
          size="small"
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          size="small"
          label={t("workOrder.filterByType")}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value={ALL_TYPES}>{t("workOrder.allTypes")}</MenuItem>
          {workOrderTypes.map((wt) => (
            <MenuItem key={wt.workOrderType} value={wt.workOrderType}>
              {wt.workOrderDescription || wt.workOrderType}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <LoadingState message={t("workOrder.loading")} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={AssignmentIcon}
          title={t("workOrder.noItems")}
          description={
            search || typeFilter !== ALL_TYPES
              ? t("workOrder.noSearchResults")
              : t("workOrder.noItemsDescription")
          }
          actionLabel={
            !search && typeFilter === ALL_TYPES ? t("workOrder.addTitle") : null
          }
          onActionClick={
            !search && typeFilter === ALL_TYPES
              ? () => setTypePickerOpen(true)
              : null
          }
        />
      ) : shouldUseBlockLayout ? (
        <LoadMoreBlockList
          items={filteredRows}
          renderItem={(item, idx) => (
            <BlockListItem
              key={item.workOrderId || idx}
              columnDefs={blockColumnDefs}
              item={item}
              onEdit={() => handleRowClick(item)}
              enableActions
              t={t}
              leadingMedia={{
                placeholder: (
                  <AssignmentIcon
                    sx={{ color: "text.secondary", fontSize: "1.1rem" }}
                  />
                ),
                width: 40,
                height: 40,
              }}
            />
          )}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            autoHeight
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.workOrderId}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              "& .MuiDataGrid-cell:focus": { outline: "none" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "background.default",
              },
            }}
          />
        </Box>
      )}

      {/* Work order type picker dialog */}
      <Dialog
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {t("workOrder.selectType")}
          <IconButton size="small" onClick={() => setTypePickerOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List disablePadding>
            {workOrderTypes.map((wt) => (
              <ListItemButton
                key={wt.workOrderType}
                onClick={() => handleAddTypeSelected(wt.workOrderType)}
              >
                <ListItemText
                  primary={wt.workOrderDescription || wt.workOrderType}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Issue Work Order dialog */}
      {issueDialogWorkOrder && (
        <WorkOrderIssueDialog
          workOrder={issueDialogWorkOrder}
          steps={getEnrichedSteps(issueDialogWorkOrder)}
          dataItems={dataItemsMap[issueDialogWorkOrder.workOrderId] || []}
          staffMap={staffMap}
          contentType={
            workOrderTypes.find(
              (wt) => wt.workOrderType === issueDialogWorkOrder.workOrderType,
            )?.contentType || "stock"
          }
          onClose={() => setIssueDialogWorkOrder(null)}
          onIssued={() => {
            setIssueDialogWorkOrder(null);
            setRefresh(true);
          }}
        />
      )}

      {/* View Work Order dialog (viewOnly — no issue button) */}
      {viewWorkOrder && (
        <WorkOrderIssueDialog
          workOrder={viewWorkOrder}
          steps={getEnrichedSteps(viewWorkOrder)}
          dataItems={dataItemsMap[viewWorkOrder.workOrderId] || []}
          staffMap={staffMap}
          contentType={
            workOrderTypes.find(
              (wt) => wt.workOrderType === viewWorkOrder.workOrderType,
            )?.contentType || "stock"
          }
          viewOnly
          onClose={() => setViewWorkOrder(null)}
          onIssued={() => {}}
        />
      )}
    </Box>
  );
};

export default WorkOrderModern;
