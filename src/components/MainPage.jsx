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
import RequisitionOrderModern from "./information/RequisitionOrderModern";
import DeliveryOrderModern from "./information/DeliveryOrderModern";
import StaffProfile from "./staffprofile/staffProfile";
import StaffMeritList from "./staffprofile/StaffMeritList";
import StaffProjectSkillMatchAnalysis from "./staffprofile/StaffProjectSkillMatchAnalysis";
import StaffSkillModern from "./baseInformation/StaffSkillModern";
import StockTakeOn from "./stock/StockTakeOn";
import StockIn from "./stock/StockIn";
import StockOut from "./stock/StockOut";
import StockTransfer from "./stock/StockTransfer";
import StockEnquiry from "./stock/StockEnquiry";
import StockCard from "./stock/StockCard";
import StockAdjustment from "./stock/StockAdjustment";
import UOMHierarchy from "./stock/UOMHierarchy";
import LanguageSettings from "./baseInformation/LanguageSettings";
import UserProfile from "./baseInformation/UserProfile";
import Settings from "./baseInformation/Settings";
import EulaPage from "./information/EulaPage";
import PrivacyPage from "./information/PrivacyPage";
import ProductModern from "./baseInformation/ProductModern";
import ProductBundleModern from "./information/ProductBundleModern";
import LibraryModern from "./information/LibraryModern";
import LibraryEntriesModern from "./information/LibraryEntriesModern";
import StaffExcelUpload from "./baseInformation/StaffExcelUpload";
import ProductExcelUpload from "./baseInformation/ProductExcelUpload";
import UserLoginList from "./baseInformation/UserLoginList";
import ForcedPassword from "./baseInformation/ForcedPassword";
import ProjectModern from "./project/ProjectModern";
import ProjectPlanningModern from "./project/ProjectPlanningModern";
import ProjectWorkbench from "./project/ProjectWorkbench";
import ProjectManpowerGenerate from "./project/ProjectManpowerGenerate";
import ProjectTaskRecalculate from "./project/ProjectTaskRecalculate";
import RequisitionGenerate from "./project/RequisitionGenerate";
import ProjectStatusControl from "./project/ProjectStatusControl";
import BuildingProgressPage from "./project/buildingProgress/BuildingProgressPage";
import VehicleModern from "./information/VehicleModern";
import WorkOrderModern from "./workorder/WorkOrderModern";
import OperationRoleModern from "./baseInformation/OperationRoleModern";
import QrGenerator from "./baseInformation/QrGenerator";
import WASimulator from "./baseInformation/WASimulator";
import ParameterModern from "./baseInformation/ParameterModern";
import BriefingModern from "./baseInformation/BriefingModern";
import BriefingContentPage from "./baseInformation/BriefingContentPage";
import TvMobileApproval from "./workorder/TvMobileApproval";

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
        <Route path="/forced-password" element={<ForcedPassword />} />
        <Route path="/customer" element={<CustomerModern />} />
        <Route path="/vendor" element={<VendorModern />} />
        <Route path="/purchaseorder" element={<PurchaseOrderModern />} />
        <Route
          path="/requisition-orders"
          element={<RequisitionOrderModern />}
        />
        <Route path="/deliveryorder" element={<DeliveryOrderModern />} />
        <Route path="/staffskill" element={<StaffSkillModern />} />
        <Route path="/staffmerit" element={<StaffMeritList />} />
        <Route path="/staff-excel-upload" element={<StaffExcelUpload />} />
        <Route path="/product-excel-upload" element={<ProductExcelUpload />} />
        <Route path="/stockmovementcode" element={<StockMovementCode />} />
        <Route path="/stocktakeon" element={<StockTakeOn />} />
        <Route path="/stockin" element={<StockIn />} />
        <Route path="/stockout" element={<StockOut />} />
        <Route path="/stocktransfer" element={<StockTransfer />} />
        <Route path="/stockadjustment" element={<StockAdjustment />} />
        <Route path="/stockenquiry" element={<StockEnquiry />} />
        <Route path="/stockcard" element={<StockCard />} />
        <Route path="/uomhierarchy" element={<UOMHierarchy />} />
        <Route path="/productbundle" element={<ProductBundleModern />} />
        <Route path="/library" element={<LibraryModern />} />
        <Route
          path="/library/:libraryCatelogId/entries"
          element={<LibraryEntriesModern />}
        />
        <Route path="/product" element={<ProductModern />} />
        <Route path="/staffprofile" element={<StaffProfile />} />
        <Route
          path="/project-skill-match-analysis"
          element={<StaffProjectSkillMatchAnalysis />}
        />
        <Route path="/language-settings" element={<LanguageSettings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/about/eula" element={<EulaPage />} />
        <Route path="/about/privacy" element={<PrivacyPage />} />
        <Route path="/project" element={<ProjectModern />} />
        <Route path="/projectplanning" element={<ProjectPlanningModern />} />
        <Route
          path="/projectmanpower-generate"
          element={<ProjectManpowerGenerate />}
        />
        <Route
          path="/projecttask-recalculate"
          element={<ProjectTaskRecalculate />}
        />
        <Route path="/requisition-generate" element={<RequisitionGenerate />} />
        <Route
          path="/projectplanning/:projectCode/workbench"
          element={<ProjectWorkbench />}
        />
        <Route path="/vehicle" element={<VehicleModern />} />
        <Route path="/workorder" element={<WorkOrderModern />} />
        <Route path="/operationrole" element={<OperationRoleModern />} />
        <Route path="/qr-generator" element={<QrGenerator />} />
        <Route path="/wa-simulator" element={<WASimulator />} />
        <Route path="/parameter" element={<ParameterModern />} />
        <Route path="/briefing" element={<BriefingModern />} />
        <Route
          path="/project-status-control"
          element={<ProjectStatusControl />}
        />
        <Route
          path="/project/building-progress"
          element={<BuildingProgressPage />}
        />
        <Route
          path="/briefing/:briefingId/content"
          element={<BriefingContentPage />}
        />
        <Route
          path="/operations/tv-mobile-approval"
          element={<TvMobileApproval />}
        />
      </Routes>
    </AdminLayout>
  );
}

export default MainPage;
