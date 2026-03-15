import "./App.css";

import AppContent from "./AppContent.jsx";
import { AuthProvider } from "../context/authContext.jsx";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { businessTheme } from "../theme";

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={businessTheme}>
        <CssBaseline />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
