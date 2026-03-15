# Navigation & Menu Structure Guide

## Important: Menu System Location

**The system's primary navigation menu is the SIDEBAR**, not AppMenu.

## Navigation Components

### 1. Sidebar (Primary Navigation)

**Location:** `src/layouts/components/Sidebar.jsx`

This is the **main navigation** component used in the AdminLayout. When adding new menu items or routes, **always update the Sidebar first**.

**Structure:**

```javascript
navigationItems = [
  {
    key: "dashboard",
    menu: null, // No permission check needed
    label: t("menu.dashboard"),
    icon: <DashboardIcon />,
    path: "/home",
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
      { key: "customers", label: t("menu.customer"), path: "/customer" },
      { key: "vendors", label: t("menu.vendor"), path: "/vendor" },
      {
        key: "purchaseOrders",
        label: t("menu.purchaseOrder"),
        path: "/purchaseorder",
      },
      { key: "staff", label: t("menu.staff"), path: "/staff" },
    ],
  },
  // ... other sections
];
```

**Features:**

- Collapsible sections with expand/collapse
- Mobile responsive drawer
- Permission-based visibility (via `hasMenu()` helper)
- Active route highlighting
- Icon support from Material-UI

### 2. AppMenu (Secondary/Alternative)

**Location:** `src/components/navigation/AppMenu.jsx`

This component exists but is **not the primary navigation**. Update this for consistency after updating Sidebar.

**Structure:**

```javascript
menuSections = [
  {
    key: "Dashboard",
    menu: null,
    label: t("menu.dashboard"),
    to: "/home",
  },
  {
    key: "Information",
    menu: "InformationPages",
    items: [
      { to: "/customer", label: t("menu.customer") },
      { to: "/vendor", label: t("menu.vendor") },
      { to: "/purchaseorder", label: t("menu.purchaseOrder") },
      { to: "/staff", label: t("menu.staff") },
    ],
  },
];
```

## Adding a New Menu Item - Checklist

When adding a new page/feature to the navigation:

1. ✅ **Update Sidebar** (`src/layouts/components/Sidebar.jsx`)
   - Add to appropriate section's `children` array
   - Ensure correct `key`, `label`, `icon`, and `path`

2. ✅ **Update AppMenu** (`src/components/navigation/AppMenu.jsx`)
   - Add to corresponding section's `items` array
   - Match the structure from Sidebar

3. ✅ **Update MainPage Routes** (`src/components/MainPage.jsx`)
   - Import the component
   - Add `<Route path="/newpath" element={<NewComponent />} />`

4. ✅ **Add Translations** (`src/locales/en/translation.json` and `src/locales/zh/translation.json`)
   - Add menu label to `"menu"` section
   - Add all component-specific translations

5. ✅ **Create Component Files**
   - `ComponentModern.jsx` (list view)
   - `ComponentAdd.jsx` (add form)
   - `ComponentEdit.jsx` (edit form)
   - `ComponentDelete.jsx` (delete confirmation)

## Menu Permission System

The sidebar uses permission checking via the `menu` property:

- `menu: null` - No permission required (e.g., Dashboard)
- `menu: "MenuKey"` - Single permission check
- `menu: ["Key1", "Key2"]` - Multiple permission options (OR logic)

Permissions are checked using `hasMenu(menuKey, menus)` from `src/helpers/roles_helper.js`

## Current Menu Structure

```
📊 Dashboard
📁 Base Setup
   └─ Companies, Roles
📁 Base Admin
   └─ Users, User Roles
📁 Business Setup
   └─ Staff Skills
📁 Information (InformationPages)
   └─ Customers, Vendors, Purchase Orders, Staff
📁 Staff Management
   └─ Staff Profile
```

## Icons Used

Common icons from `@mui/icons-material`:

- `DashboardIcon` - Dashboard
- `AdminPanelSettingsIcon` - Admin sections
- `BusinessIcon` - Business/Company related
- `StoreIcon` - Vendor/Store related
- `PeopleIcon` - User/Staff related
- `GroupIcon` - Role/Group related
- `AutoStoriesIcon` - Documentation/Skills

## Mobile Responsiveness

The Sidebar automatically:

- Becomes a temporary drawer on mobile (`< md` breakpoint)
- Closes automatically after navigation on mobile
- Can be collapsed/expanded on desktop
- Width: 260px (expanded), 64px (collapsed)

## Last Updated

February 16, 2026 - Added Purchase Order to Information section
