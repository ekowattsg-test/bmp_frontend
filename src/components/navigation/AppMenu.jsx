import React, { useContext, useMemo } from "react";
import { AuthContext } from "../../context/authContext";
import { useTranslation } from "react-i18next";
import { hasRole, hasMenu } from "../../helpers/roles_helper";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  AdminPanelSettings,
  Business,
  ExitToApp,
  Info,
  Dashboard,
  People,
  AutoStories,
  UploadFile,
  History,
  Store,
  CompareArrows,
  Assignment,
  AccountTree,
  Task,
  Inventory2,
  Warehouse,
  EngineeringOutlined as EngineeringIcon,
  ManageAccounts,
  Tune,
  WhatsApp,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

const AppMenu = () => {
  const {
    roles,
    menus,
    param,
    logout,
    currMenu,
    setOpenMenu,
    setCurrMenu,
    userInfo,
  } = useContext(AuthContext);
  const { t } = useTranslation();
  const userLevel = Number(userInfo?.userLevel ?? userInfo?.level ?? 0);
  const canAccessWaSimulator = userLevel >= 5;

  const getParamValue = (key) => param?.[key];
  const isParamEnabled = (key) => Number(getParamValue(key) ?? 0) === 1;

  const menuSections = useMemo(
    () => [
      {
        key: "Dashboard",
        menu: null,
        label: t("menu.dashboard", "Dashboard"),
        icon: <Dashboard />,
        to: "/home",
      },
      {
        key: "BaseSetup",
        menu: "BaseSetup",
        label: t("menu.baseSetup"),
        icon: <AdminPanelSettings />,
        items: [
          {
            to: "/company",
            label: t("menu.companyList"),
            icon: <Business />,
          },
          {
            to: "/role",
            label: t("menu.roleList"),
            icon: <Business />,
          },
          {
            to: "/stockmovementcode",
            label: t("menu.stockMovementCode"),
            icon: <AutoStories />,
          },
        ],
      },
      {
        key: "Admin",
        menu: "Admin",
        label: t("menu.baseAdmin", "Base Admin"),
        icon: <AdminPanelSettings />,
        items: [
          {
            to: "/user",
            label: t("menu.userList"),
            icon: <Business />,
          },
          {
            to: "/userrole",
            label: t("menu.userRoleList", "UserRole List"),
            icon: <Business />,
          },
          {
            to: "/userlogin",
            label: t("menu.userLoginList", "Login Enquiry"),
            icon: <History />,
          },
          {
            to: "/parameter",
            label: t("menu.parameter", "Parameter"),
            icon: <Tune />,
          },
        ],
      },
      {
        key: "BusinessSetup",
        menu: "BusinessSetup",
        label: t("menu.businessSetup", "Business Setup"),
        icon: <Business />,
        items: [
          {
            to: "/staffskill",
            label: t("menu.staffSkillList", "Staff Skill List"),
            icon: <AutoStories />,
          },
          {
            to: "/staff-excel-upload",
            label: t("menu.staffExcelUpload", "Staff Excel Upload"),
            icon: <UploadFile />,
          },
          {
            to: "/product-excel-upload",
            label: t("menu.productExcelUpload", "Product Excel Upload"),
            icon: <UploadFile />,
          },
          {
            to: "/operationrole",
            label: t("menu.operationRole", "Operation Roles"),
            icon: <ManageAccounts />,
          },
          canAccessWaSimulator
            ? {
                to: "/wa-simulator",
                label: t("menu.waSimulator", "WA Simulator"),
                icon: <WhatsApp />,
              }
            : null,
        ],
      },
      {
        key: "Information",
        menu: "InformationPages",
        label: t("menu.information"),
        icon: <Info />,
        items: [
          {
            to: "/customer",
            label: t("menu.customer"),
            icon: <Business />,
          },
          {
            to: "/vendor",
            label: t("menu.vendor"),
            icon: <Business />,
          },
          {
            to: "/purchaseorder",
            label: t("menu.purchaseOrder"),
            icon: <Business />,
          },
          {
            to: "/staff",
            label: t("menu.staff", "Staff"),
            icon: <Business />,
          },
          {
            to: "/product",
            label: t("menu.productList", "Products"),
            icon: <Store />,
          },
        ],
      },
      {
        key: "StaffManagement",
        menu: "StaffManagement",
        label: t("menu.staffManagement", "Staff Management"),
        icon: <People />,
        items: [
          {
            to: "/staffprofile",
            label: t("menu.staffProfile", "Staff Profile"),
            icon: <People />,
          },
        ],
      },
      {
        key: "Inventory",
        menu: "Inventory",
        label: t("menu.inventory", "Inventory"),
        icon: <Store />,
        items: [
          isParamEnabled("stockTakeOn")
            ? {
                to: "/stocktakeon",
                label: t("menu.stockTake", "Stock Take On"),
                icon: <Store />,
              }
            : null,
          isParamEnabled("manualStockEntry")
            ? {
                to: "/stockin",
                label: t("menu.stockIn", "Stock In"),
                icon: <Store />,
              }
            : null,
          isParamEnabled("manualStockEntry")
            ? {
                to: "/stockout",
                label: t("menu.stockOut", "Stock Out"),
                icon: <Store />,
              }
            : null,
          isParamEnabled("manualStockEntry")
            ? {
                to: "/stocktransfer",
                label: t("menu.stockTransfer", "Stock Transfer"),
                icon: <CompareArrows />,
              }
            : null,
          {
            to: "/stockadjustment",
            label: t("menu.stockAdjustment", "Stock Adjustment"),
            icon: <CompareArrows />,
          },
          {
            to: "/stockenquiry",
            label: t("menu.stockEnquiry", "Stock Enquiry"),
            icon: <History />,
          },
          {
            to: "/stockcard",
            label: t("menu.stockCard", "Inventory Card"),
            icon: <History />,
          },
        ].filter(Boolean),
      },
      {
        key: "Projects",
        menu: "ProjectControl",
        label: t("menu.projects", "Projects"),
        icon: <Assignment />,
        items: [
          {
            to: "/project",
            label: t("menu.projectList", "Project List"),
            icon: <Assignment />,
          },
          {
            to: "/projectplanning",
            label: t("menu.projectPlanning", "Project Workbench"),
            icon: <AccountTree />,
          },
        ],
      },
      {
        key: "WorkOrders",
        menu: null,
        role: "WorkOrders",
        label: t("menu.workOrders", "Work Orders"),
        icon: <EngineeringIcon />,
        items: [
          {
            to: "/workorder",
            label: t("menu.workOrderList", "Work Order List"),
            icon: <EngineeringIcon />,
          },
        ],
      },
    ],
    [t],
  );

  const visibleSections = menuSections.filter((section) => {
    if (section.items && section.items.length === 0) {
      return false;
    }

    if (section.role) {
      if (Array.isArray(section.role)) {
        return section.role.some((r) => hasRole(r, roles));
      }
      return hasRole(section.role, roles);
    }
    return !section.menu || hasMenu(section.menu, menus);
  });
  const styles = {
    container: {
      padding: "4px 0",
      width: "100%",
      boxSizing: "border-box",
    },
    list: {
      width: "100%",
      boxSizing: "border-box",
    },
    nestedList: {
      paddingLeft: 32,
      paddingTop: 4,
      paddingBottom: 4,
    },
  };

  return (
    <>
      <div style={styles.container}>
        <List style={styles.list} disablePadding>
          {visibleSections.map((section) => {
            const isActive = currMenu === section.key;
            // If section has a direct 'to' link (like Dashboard), render it as a single item
            if (section.to) {
              return (
                <ListItem disablePadding key={section.key}>
                  <ListItemButton
                    className={`menu-listitem${isActive ? " selected" : ""}`}
                    component={Link}
                    to={section.to}
                    onClick={() => {
                      setOpenMenu(false);
                      setCurrMenu(section.key);
                    }}
                  >
                    <ListItemIcon>{section.icon}</ListItemIcon>
                    <ListItemText primary={section.label} />
                  </ListItemButton>
                </ListItem>
              );
            }
            // Otherwise render expandable section with items
            return (
              <Box key={section.key} sx={{ width: "100%" }}>
                <ListItem disablePadding>
                  <ListItemButton
                    className={`menu-listitem${isActive ? " selected" : ""}`}
                    onClick={() => setCurrMenu(section.key)}
                  >
                    <ListItemIcon>{section.icon}</ListItemIcon>
                    <ListItemText primary={section.label} />
                  </ListItemButton>
                </ListItem>
                {isActive && (
                  <List
                    component="div"
                    disablePadding
                    style={styles.nestedList}
                    onClick={() => setOpenMenu(false)}
                  >
                    {section.items.map((item) => (
                      <ListItem disablePadding key={item.to}>
                        <ListItemButton
                          className="menu-listitem"
                          component={Link}
                          to={item.to}
                        >
                          <ListItemIcon>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            );
          })}
          <ListItem disablePadding>
            <ListItemButton
              className="menu-listitem"
              component={Link}
              to="/"
              onClick={() => {
                setOpenMenu(false);
                setCurrMenu("");
                logout();
              }}
            >
              <ListItemIcon>
                <ExitToApp />
              </ListItemIcon>
              <ListItemText primary={t("menu.logout")} />
            </ListItemButton>
          </ListItem>
        </List>
      </div>
      <div
        style={{
          width: "100%",
          borderBottom: "1px solid var(--color-gray-300)",
          marginTop: 8,
        }}
      ></div>
    </>
  );
};

export default AppMenu;
