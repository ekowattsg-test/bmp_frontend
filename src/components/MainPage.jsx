import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AppHome from "./AppHome";
import CompanyModern from "./baseInformation/CompanyModern";
import StockMovementCode from "./baseInformation/StockMovementCode";
import RoleModern from "./baseInformation/RoleModern";
import StaffModern from "./baseInformation/StaffModern";
import UserRoleModern from "./baseInformation/UserRoleModern";
import UserModern from "./baseInformation/UserModern";
import CustomerModern from "./information/CustomerModern";
import VendorModern from "./information/VendorModern";
import PurchaseOrderModern from "./information/PurchaseOrderModern";
import StaffProfile from "./staffprofile/staffProfile";
import StaffSkillModern from "./baseInformation/StaffSkillModern";
import StockTakeOn from "./stock/StockTakeOn";
import StockEnquiry from "./stock/StockEnquiry";
import StockAdjustment from "./stock/StockAdjustment";
import LanguageSettings from "./baseInformation/LanguageSettings";
import UserProfile from "./baseInformation/UserProfile";
import Settings from "./baseInformation/Settings";
import EulaPage from "./information/EulaPage";
import PrivacyPage from "./information/PrivacyPage";
import ProductModern from "./baseInformation/ProductModern";
import StaffExcelUpload from "./baseInformation/StaffExcelUpload";
import UserLoginList from "./baseInformation/UserLoginList";

function MainPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AppHome />} />
        <Route path="/home" element={<AppHome />} />
        <Route path="/company" element={<CompanyModern />} />
        <Route path="/role" element={<RoleModern />} />
        <Route path="/staff" element={<StaffModern />} />
        <Route path="/user" element={<UserModern />} />
        <Route path="/userRole" element={<UserRoleModern />} />
        <Route path="/userlogin" element={<UserLoginList />} />
        <Route path="/customer" element={<CustomerModern />} />
        <Route path="/vendor" element={<VendorModern />} />
        <Route path="/purchaseorder" element={<PurchaseOrderModern />} />
        <Route path="/staffskill" element={<StaffSkillModern />} />
        <Route path="/staff-excel-upload" element={<StaffExcelUpload />} />
        <Route path="/stockmovementcode" element={<StockMovementCode />} />
        <Route path="/stocktakeon" element={<StockTakeOn />} />
        <Route path="/stockadjustment" element={<StockAdjustment />} />
        <Route path="/stockenquiry" element={<StockEnquiry />} />
        <Route path="/product" element={<ProductModern />} />
        <Route path="/staffprofile" element={<StaffProfile />} />
        <Route path="/language-settings" element={<LanguageSettings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/about/eula" element={<EulaPage />} />
        <Route path="/about/privacy" element={<PrivacyPage />} />
      </Routes>
    </AdminLayout>
  );
}

export default MainPage;
