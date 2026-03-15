import React, { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";
import { useTranslation } from "react-i18next";
import { Menu, Notifications } from "@mui/icons-material";
import { Box, Drawer } from "@mui/material";
import AppMenu from "./navigation/AppMenu";
import LanguageSwitcher from "./LanguageSwitcher";

const menuItems = [
  { key: "home", label: "Home" },
  { key: "profile", label: "Profile" },
  { key: "settings", label: "Settings" },
];

const renderPageContent = (selected) => {
  switch (selected) {
    case "home":
      return <div style={{ padding: 24 }}>Welcome to the Home page!</div>;
    case "profile":
      return <div style={{ padding: 24 }}>This is your Profile page.</div>;
    case "settings":
      return <div style={{ padding: 24 }}>Settings go here.</div>;
    default:
      return null;
  }
};

const Dashboard = (props) => {
  const [showUserNameMobile, setShowUserNameMobile] = useState(false);
  const { t } = useTranslation();
  const {
    isAuthenticated,
    userInfo,
    openMenu,
    openNotice,
    setOpenMenu,
    setCurrMenu,
    setOpenNotice,
  } = useContext(AuthContext);
  const [selected, setSelected] = useState("home");
  const closeMenuTimer = useRef(null);

  const clearCloseTimer = () => {
    if (closeMenuTimer.current) {
      clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
  };

  const handleOpenMenu = () => {
    clearCloseTimer();
    setOpenMenu(true);
  };

  const scheduleCloseMenu = () => {
    clearCloseTimer();
    closeMenuTimer.current = setTimeout(() => {
      setOpenMenu(false);
      setCurrMenu("");
    }, 180);
  };

  const handleCloseMenu = () => {
    clearCloseTimer();
    setOpenMenu(false);
    setCurrMenu("");
  };

  useEffect(() => () => clearCloseTimer(), []);
  // const [openMenu, setOpenMenu] = useState(false);
  // const [currMenu, setCurrMenu] = useState("main");
  // const [openNotice, setOpenNotice] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      {isAuthenticated && (
        <Box
          component="header"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 100,
            boxShadow: "var(--shadow-sm)",
            // backgroundColor: "var(--color-white)", // match Header.jsx default background
            // color: "var(--color-dark)",
            px: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 1.5 },
          }}
          className="App-header"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              gap: { xs: 1, sm: 2 },
              justifyContent: "space-between",
              flexWrap: "nowrap",
            }}
          >
            {/* Left: Menu Icon */}
            <button
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "inherit",
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => (openMenu ? handleCloseMenu() : handleOpenMenu())}
              onMouseEnter={handleOpenMenu}
              onMouseLeave={scheduleCloseMenu}
              aria-label="Open menu"
            >
              <Menu
                sx={{
                  fontSize: { xs: "clamp(1.5rem, 4vw, 2.5rem)", md: "2.5rem" },
                }}
              />
            </button>
            {/* Center: Title */}
            <h3
              style={{
                fontSize: "clamp(1.2rem, 4vw, 2rem)",
                margin: 0,
                fontWeight: 600,
                wordBreak: "break-word",
                flex: 1,
                textAlign: "center",
              }}
            >
              {t("header.title")}
            </h3>
            {/* Right: Notifications, LanguageSwitcher, UserName/UserIcon */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: 100,
              }}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setOpenNotice((prev) => !prev)}
                aria-label="Open notifications"
              >
                <Notifications
                  sx={{
                    fontSize: {
                      xs: "clamp(1.5rem, 4vw, 2.5rem)",
                      md: "2.5rem",
                    },
                  }}
                />
              </button>
              <Box sx={{ ml: 1 }}>
                <LanguageSwitcher />
              </Box>
              {/* Responsive User Name/Icon */}
              <Box sx={{ ml: 1 }}>
                {/* Show user name on md+ screens, icon on xs/sm */}
                <Box
                  sx={{
                    display: { xs: "none", md: "block" },
                    fontSize: { md: "1.1rem" },
                    fontWeight: 500,
                  }}
                >
                  {userInfo.lastName} {userInfo.firstName}
                </Box>
                <Box sx={{ display: { xs: "block", md: "none" } }}>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={() => setShowUserNameMobile((prev) => !prev)}
                    aria-label="Show user name"
                  >
                    {/* Head/Person icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="28"
                      viewBox="0 0 24 24"
                      width="28"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
                    </svg>
                  </button>
                </Box>
              </Box>
            </Box>
          </Box>
          {/* Floating user name for mobile, absolutely positioned over header/content */}
          {showUserNameMobile && (
            <Box
              sx={{
                position: "absolute",
                top: 56,
                right: 8,
                zIndex: 200,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 3,
                px: 2,
                py: 1,
                fontSize: "1rem",
                fontWeight: 500,
                textAlign: "center",
                minWidth: 120,
                color: "black",
              }}
            >
              {userInfo.lastName} {userInfo.firstName}
            </Box>
          )}
        </Box>
      )}

      {/* Content */}
      <main
        style={{
          position: "absolute",
          top: "calc(56px - 10px)",
          left: 0,
          width: "100%",
          height: "calc(100vh - 56px - 64px)",
          overflowY: "auto",
          background: "var(--color-bg-alt)",
        }}
      >
        {openNotice && (
          <div
            style={{
              backgroundColor: "var(--color-primary)",
              padding: "10px",
            }}
          >
            Notifications
          </div>
        )}
        {/* {renderPageContent(selected)} */}
        {props.children}
      </main>

      <Drawer
        anchor="left"
        open={openMenu}
        onClose={handleCloseMenu}
        onMouseEnter={handleOpenMenu}
        onMouseLeave={scheduleCloseMenu}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: 280, sm: 320 },
            pt: { xs: 1, sm: 2 },
            pb: 2,
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <AppMenu />
        </Box>
      </Drawer>

      {/* Fixed Menu at Bottom */}
      {/* <nav
        style={{
          height: 64,
          background: "var(--color-white)",
          borderTop: "1px solid var(--color-gray-300)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 100,
        }}
      >
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setSelected(item.key)}
            style={{
              flex: 1,
              height: 40,
              margin: "0 8px",
              borderRadius: 20,
              border:
                selected === item.key
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-gray-300)",
              background:
                selected === item.key
                  ? "var(--color-primary)"
                  : "var(--color-bg-alt)",
              color:
                selected === item.key
                  ? "var(--color-white)"
                  : "var(--color-dark)",
              fontWeight: selected === item.key ? "bold" : "normal",
              fontSize: 16,
              cursor: "pointer",
              boxShadow:
                selected === item.key ? "var(--shadow-md)" : "none",
            }}
          >
            {item.label}
          </button>
        ))}
      </nav> */}
    </div>
  );
};

export default Dashboard;
