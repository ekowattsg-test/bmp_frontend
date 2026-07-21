import React, { useContext, useMemo } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  useMediaQuery,
  useTheme,
  IconButton,
  Typography,
} from "@mui/material";
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  Store as StoreIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  CompareArrows as CompareArrowsIcon,
  PersonAdd as PersonAddIcon,
  AutoStories as AutoStoriesIcon,
  UploadFile as UploadFileIcon,
  Description as DescriptionIcon,
  LocalLibrary as LocalLibraryIcon,
  AccountTree as AccountTreeIcon,
  Inventory2 as BundleIcon,
  LockReset as LockResetIcon,
  Assignment as AssignmentIcon,
  Task as TaskIcon,
  People as PeopleManpowerIcon,
  Warehouse as WarehouseIcon,
  EngineeringOutlined as EngineeringIcon,
  DirectionsCar as CarIcon,
  ManageAccounts as ManageAccountsIcon,
  LocalShipping as LocalShippingIcon,
  QrCode2 as QrCode2Icon,
  Tune as TuneIcon,
  WhatsApp as WhatsAppIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authContext";
import { hasRole, hasMenu } from "../../helpers/roles_helper";

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 64;

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { roles, menus, param, userInfo } = useContext(AuthContext);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [expandedItems, setExpandedItems] = React.useState({});
  const userLevel = Number(userInfo?.userLevel ?? userInfo?.level ?? 0);
  const canAccessWaSimulator = userLevel >= 5;

  const getParamValue = (key) => param?.[key];
  const isParamEnabled = (key) => Number(getParamValue(key) ?? 0) === 1;

  const navigationItems = useMemo(
    () =>
      [
        {
          key: "dashboard",
          menu: null,
          label: t("menu.dashboard", "Dashboard"),
          icon: <DashboardIcon />,
          path: "/home",
        },
        {
          key: "BaseSetup",
          menu: "BaseSetup",
          label: t("menu.baseSetup"),
          icon: <AdminPanelSettingsIcon />,
          children: [
            {
              key: "companies",
              label: t("menu.companyList"),
              icon: <BusinessIcon fontSize="small" />,
              path: "/company",
            },
            {
              key: "roles",
              label: t("menu.roleList"),
              icon: <GroupIcon fontSize="small" />,
              path: "/role",
            },
            {
              key: "stockMovementCode",
              label: t("menu.stockMovementCode"),
              icon: <AutoStoriesIcon fontSize="small" />,
              path: "/stockmovementcode",
            },
          ],
        },

        {
          key: "Admin",
          menu: "Admin",
          label: t("menu.baseAdmin", "Base Admin"),
          icon: <AdminPanelSettingsIcon />,
          children: [
            {
              key: "users",
              label: t("menu.userList"),
              icon: <PeopleIcon fontSize="small" />,
              path: "/user",
            },
            {
              key: "userRoles",
              label: t("menu.userRoleList", "User Role List"),
              icon: <GroupIcon fontSize="small" />,
              path: "/userRole",
            },
            {
              key: "userLogins",
              label: t("menu.userLoginList", "Login Enquiry"),
              icon: <HistoryIcon fontSize="small" />,
              path: "/userlogin",
            },
            {
              key: "forcedPassword",
              label: t("menu.forcedPassword", "Forced Password"),
              icon: <LockResetIcon fontSize="small" />,
              path: "/forced-password",
            },
            {
              key: "qrGenerator",
              label: t("menu.qrGenerator", "QR Generator"),
              icon: <QrCode2Icon fontSize="small" />,
              path: "/qr-generator",
            },
            {
              key: "parameter",
              label: t("menu.parameter", "Parameter"),
              icon: <TuneIcon fontSize="small" />,
              path: "/parameter",
            },
          ],
        },
        {
          key: "BusinessSetup",
          menu: "BusinessSetup",
          label: t("menu.businessSetup"),
          icon: <BusinessIcon />,
          children: [
            {
              key: "staffSkills",
              label: t("menu.staffSkillList", "Staff Skill List"),
              icon: <AutoStoriesIcon fontSize="small" />,
              path: "/staffskill",
            },
            {
              key: "staffExcelUpload",
              label: t("menu.staffExcelUpload", "Staff Excel Upload"),
              icon: <UploadFileIcon fontSize="small" />,
              path: "/staff-excel-upload",
            },
            {
              key: "productExcelUpload",
              label: t("menu.productExcelUpload", "Product Excel Upload"),
              icon: <UploadFileIcon fontSize="small" />,
              path: "/product-excel-upload",
            },
            {
              key: "operationRole",
              label: t("menu.operationRole", "Operation Roles"),
              icon: <ManageAccountsIcon fontSize="small" />,
              path: "/operationrole",
            },
            canAccessWaSimulator
              ? {
                  key: "waSimulator",
                  label: t("menu.waSimulator", "WA Simulator"),
                  icon: <WhatsAppIcon fontSize="small" />,
                  path: "/wa-simulator",
                }
              : null,
          ].filter(Boolean),
        },
        {
          key: "Information",
          menu: [
            "InformationPages",
            "Information",
            "BusinessInformation",
            "BusinessData",
          ],
          label: t("menu.information"),
          icon: <StoreIcon />,
          children: [
            {
              key: "customers",
              label: t("menu.customer"),
              icon: <PeopleIcon fontSize="small" />,
              path: "/customer",
            },
            {
              key: "vendors",
              label: t("menu.vendor"),
              icon: <StoreIcon fontSize="small" />,
              path: "/vendor",
            },
            {
              key: "vehicles",
              label: t("menu.vehicle", "Vehicles"),
              icon: <CarIcon fontSize="small" />,
              path: "/vehicle",
            },
            {
              key: "staff",
              label: t("menu.staff", "Staff"),
              icon: <PeopleIcon fontSize="small" />,
              path: "/staff",
            },
            {
              key: "products",
              label: t("menu.productList", "Products"),
              icon: <StoreIcon fontSize="small" />,
              path: "/product",
            },
            {
              key: "library",
              label: t("menu.library", "Library"),
              icon: <LocalLibraryIcon fontSize="small" />,
              path: "/library",
            },
            {
              key: "uomHierarchy",
              label: t("menu.uomHierarchy", "Product Hierarchy"),
              icon: <AccountTreeIcon fontSize="small" />,
              path: "/uomhierarchy",
            },
            {
              key: "productBundle",
              label: t("menu.productBundle", "Product Bundles"),
              icon: <BundleIcon fontSize="small" />,
              path: "/productbundle",
            },
          ],
        },
        {
          key: "StaffManagement",
          menu: "StaffManagement",
          label: t("menu.staffManagement", "Staff Management"),
          icon: <PersonAddIcon />,
          children: [
            {
              key: "staffProfile",
              label: t("menu.staffProfile", "Staff Profile"),
              icon: <PeopleIcon fontSize="small" />,
              path: "/staffprofile",
            },
          ],
        },
        {
          key: "Inventory",
          menu: "Inventory",
          label: t("menu.inventory", "Inventory"),
          icon: <StoreIcon />,
          children: [
            isParamEnabled("stockTakeOn")
              ? {
                  key: "stockTakeOn",
                  label: t("menu.stockTake", "Stock Take On"),
                  icon: <AutoStoriesIcon fontSize="small" />,
                  path: "/stocktakeon",
                }
              : null,
            isParamEnabled("manualStockEntry")
              ? {
                  key: "stockIn",
                  label: t("menu.stockIn", "Stock In"),
                  icon: <AutoStoriesIcon fontSize="small" />,
                  path: "/stockin",
                }
              : null,
            isParamEnabled("manualStockEntry")
              ? {
                  key: "stockOut",
                  label: t("menu.stockOut", "Stock Out"),
                  icon: <AutoStoriesIcon fontSize="small" />,
                  path: "/stockout",
                }
              : null,
            {
              key: "stockTransfer",
              label: t("menu.stockTransfer", "Stock Transfer"),
              icon: <CompareArrowsIcon fontSize="small" />,
              path: "/stocktransfer",
            },
            {
              key: "stockAdjustment",
              label: t("menu.stockAdjustment", "Stock Adjustment"),
              icon: <CompareArrowsIcon fontSize="small" />,
              path: "/stockadjustment",
            },
            {
              key: "stockEnquiry",
              label: t("menu.stockEnquiry", "Stock Enquiry"),
              icon: <HistoryIcon fontSize="small" />,
              path: "/stockenquiry",
            },
            {
              key: "stockCard",
              label: t("menu.stockCard", "Inventory Card"),
              icon: <HistoryIcon fontSize="small" />,
              path: "/stockcard",
            },
          ].filter(Boolean),
        },
        {
          key: "ProjectManagement",
          menu: "ProjectControl",
          label: t("menu.projectManagement", "Project Management"),
          icon: <AssignmentIcon />,
          children: [
            {
              key: "briefing",
              label: t("menu.briefing", "Briefing Setup"),
              icon: <DescriptionIcon fontSize="small" />,
              path: "/briefing",
              minLevel: 3,
            },
          ],
        },
        {
          key: "Projects",
          menu: "ProjectControl",
          label: t("menu.projects", "Projects"),
          icon: <AssignmentIcon />,
          children: [
            {
              key: "projectList",
              label: t("menu.projectList", "Project List"),
              icon: <AssignmentIcon fontSize="small" />,
              path: "/project",
              minLevel: 3,
            },
            {
              key: "projectPlanning",
              label: t("menu.projectPlanning", "Project Workbench"),
              icon: <AccountTreeIcon fontSize="small" />,
              path: "/projectplanning",
              minLevel: 1,
            },
            {
              key: "projectManpowerGenerate",
              label: t(
                "menu.projectManpowerGenerate",
                "Generate Project Manpower",
              ),
              icon: <PeopleManpowerIcon fontSize="small" />,
              path: "/projectmanpower-generate",
              minLevel: 5,
            },
            {
              key: "projectTaskRecalculate",
              label: t(
                "menu.projectTaskRecalculate",
                "Recalculate Project Tasks",
              ),
              icon: <TaskIcon fontSize="small" />,
              path: "/projecttask-recalculate",
              minLevel: 5,
            },
            {
              key: "requisitionGenerate",
              label: t(
                "menu.requisitionGenerate",
                "Generate Stock Requisition",
              ),
              icon: <AssignmentIcon fontSize="small" />,
              path: "/requisition-generate",
              minLevel: 5,
            },
          ],
        },
        {
          key: "WorkOrders",
          menu: null,
          role: "Operations",
          label: t("menu.workOrders", "Operations"),
          icon: <EngineeringIcon />,
          children: [
            {
              key: "purchaseOrders",
              label: t("menu.purchaseOrder"),
              icon: <BusinessIcon fontSize="small" />,
              path: "/purchaseorder",
            },
            {
              key: "requisitionOrders",
              label: t("menu.requisitionOrder", "Requisition Order"),
              icon: <AssignmentIcon fontSize="small" />,
              path: "/requisition-orders",
            },
            {
              key: "deliveryOrders",
              label: t("menu.deliveryOrder", "Delivery Orders"),
              icon: <LocalShippingIcon fontSize="small" />,
              path: "/deliveryorder",
            },
            {
              key: "workOrderList",
              label: t("menu.workOrderList", "Work Orders"),
              icon: <EngineeringIcon fontSize="small" />,
              path: "/workorder",
            },
          ],
        },
      ]
        .map((section) => ({
          ...section,
          children: section.children
            ?.filter(Boolean)
            .filter((child) =>
              child.minLevel === undefined ? true : userLevel >= child.minLevel,
            ),
        }))
        .filter((section) => {
          if (section.children && section.children.length === 0) {
            return false;
          }

          if (section.role) {
            if (Array.isArray(section.role)) {
              return section.role.some((r) => hasRole(r, roles));
            }
            return hasRole(section.role, roles);
          }

          if (!section.menu) return true;

          if (Array.isArray(section.menu)) {
            return section.menu.some((menuKey) => hasMenu(menuKey, menus));
          }

          return hasMenu(section.menu, menus);
        }),
    [roles, menus, param, t, userLevel],
  );

  const handleItemClick = (item) => {
    if (item.children) {
      setExpandedItems((prev) => ({
        ...prev,
        [item.key]: !prev[item.key],
      }));
    } else if (item.path) {
      // Close all expanded items when navigating to a submenu item
      const parentItem = navigationItems.find(
        (navItem) =>
          navItem.children &&
          navItem.children.some((child) => child.key === item.key),
      );

      if (parentItem) {
        // Keep only the parent section expanded
        setExpandedItems({
          [parentItem.key]: true,
        });
      } else {
        // If it's a top-level item with path, close all sections
        setExpandedItems({});
      }

      navigate(item.path);
      if (isMobile) {
        onClose();
      }
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isParentActive = (item) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.path));
    }
    return false;
  };

  const drawerWidth =
    collapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.sidebar?.background || "#1e293b",
        color: theme.palette.sidebar?.text || "#e2e8f0",
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isMobile ? "center" : "space-between",
          p: 2,
          minHeight: 64,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {(!collapsed || isMobile) && (
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("app.name", "BMP System")}
          </Typography>
        )}
        {!isMobile && (
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: "inherit",
              "&:hover": {
                bgcolor:
                  theme.palette.sidebar?.hover || "rgba(255,255,255,0.1)",
              },
            }}
          >
            <ChevronLeft
              sx={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.3s",
              }}
            />
          </IconButton>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1 }}>
        <List sx={{ px: 1 }}>
          {navigationItems.map((item) => (
            <React.Fragment key={item.key}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  selected={
                    item.path ? isActive(item.path) : isParentActive(item)
                  }
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    justifyContent:
                      collapsed && !isMobile ? "center" : "flex-start",
                    px: collapsed && !isMobile ? 1 : 2,
                    bgcolor: "transparent",
                    "&:hover": {
                      bgcolor:
                        theme.palette.sidebar?.hover || "rgba(255,255,255,0.1)",
                    },
                    "&.Mui-selected": {
                      bgcolor:
                        theme.palette.sidebar?.active ||
                        theme.palette.primary.main,
                      "&:hover": {
                        bgcolor:
                          theme.palette.sidebar?.active ||
                          theme.palette.primary.dark,
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed && !isMobile ? 0 : 40,
                      color: "inherit",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {(!collapsed || isMobile) && (
                    <>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                        }}
                      />
                      {item.children &&
                        (expandedItems[item.key] ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        ))}
                    </>
                  )}
                </ListItemButton>
              </ListItem>

              {/* Submenu Items */}
              {item.children && (!collapsed || isMobile) && (
                <Collapse
                  in={expandedItems[item.key]}
                  timeout="auto"
                  unmountOnExit
                >
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItem
                        key={child.key}
                        disablePadding
                        sx={{
                          pl: 2,
                          bgcolor: "transparent",
                          "&:hover": {
                            bgcolor: "transparent",
                          },
                        }}
                      >
                        <ListItemButton
                          onClick={() => handleItemClick(child)}
                          selected={isActive(child.path)}
                          sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            pl: 3,
                            bgcolor: "transparent",
                            "&:hover": {
                              bgcolor:
                                theme.palette.sidebar?.hover ||
                                "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-selected": {
                              bgcolor: theme.palette.primary.main,
                              "&:hover": {
                                bgcolor: theme.palette.primary.dark,
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 36,
                              color: "inherit",
                            }}
                          >
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              fontSize: "0.8125rem",
                              fontWeight: 400,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>

      {/* Sidebar Footer */}
      {(!collapsed || isMobile) && (
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {t("app.version", "v1.0.0")}
          </Typography>
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          borderRight: "none",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
