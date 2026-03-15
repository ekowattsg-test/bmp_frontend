# Copilot Instructions for BMP Frontend

## Project Overview

BMP Frontend is a React + Material-UI (v5) application with multilingual support, accessible high-contrast mode, and a centralized theme system. All styling must use CSS variables and the MUI theme for maintainability and theme consistency.

---

## Styling & Theme Rules

### 1. **No Hardcoded Colors**

- ❌ **Never** use hardcoded hex values (e.g., `#7AC142`, `#dc3545`) or rgb/rgba in inline styles
- ✅ **Always** use CSS custom properties or MUI theme tokens
- Examples:

  ```jsx
  // ❌ Wrong
  <Box sx={{ backgroundColor: "#f5f5f5" }} />

  // ✅ Correct
  <Box sx={{ backgroundColor: "background.default" }} />

  // ✅ Also correct for custom components
  <div style={{ backgroundColor: "var(--color-gray-100)" }} />
  ```

### 2. **CSS Variable Naming Convention**

All CSS variables are defined in `src/styles/theme.css` and follow semantic naming:

**Color Categories:**

- Primary: `--color-primary`, `--color-primary-light`, `--color-primary-hover`, `--color-primary-dark`, `--color-primary-alpha-10`
- Secondary: `--color-secondary`, `--color-secondary-light`, `--color-secondary-dark`
- Status: `--color-success`, `--color-danger`, `--color-warning`, `--color-info`
- Backgrounds: `--color-bg-alt`, `--color-bg-light`, `--color-white`, `--color-gray-100`, `--color-gray-200`, `--color-gray-300`
- Text: `--color-dark`, `--color-text-primary`, `--color-text-secondary`, `--color-text-light`
- Category/Badge colors: `--color-category-{name}` (e.g., `--color-category-manager`)

**Shadow Variables:**

- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-modal`, `--shadow-danger-sm`, `--shadow-danger-md`

### 3. **MUI Theme Integration**

For Material-UI components, prefer using the MUI theme tokens via the `sx` prop:

```jsx
// ✅ Preferred for MUI components
<Button sx={{ backgroundColor: "primary.main", color: "text.primary" }} />
<Box sx={{ backgroundColor: "background.paper", boxShadow: 1 }} />

// ✅ Also acceptable for custom or complex styling
<Box sx={{ backgroundColor: "var(--color-primary)" }} />
```

The MUI palette is defined in `src/theme/businessTheme.js` and includes:

- `primary`, `secondary`, `error`, `warning`, `success`, `info`
- `background` (default, paper, alt)
- `text` (primary, secondary)
- `action` (hover, selected, disabled)
- `divider`

### 4. **High-Contrast Mode Support**

When adding new colors or styles, ensure they support high-contrast mode:

- CSS variables automatically have high-contrast variants defined in `src/styles/theme.css` (lines 1447+)
- High-contrast mode is activated via `data-high-contrast="true"` attribute on `:root` or `html`
- No additional work needed if using semantic CSS variables; they will adapt automatically
- Test new features with high-contrast mode enabled in browser DevTools

### 5. **Spacing & Typography Variables**

Standard spacing scale (use for margins, padding):

- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px

---

## Component Architecture

### 1. **Folder Structure Standards**

- **`src/components/common/`** - Reusable UI components (Button, Modal, etc.)
- **`src/components/baseInformation/`** - CRUD forms for core entities (User, Role, Staff, Company, etc.)
- **`src/components/information/`** - Display components for secondary data (Customer, Vendor)
- **`src/components/navigation/`** - Navigation elements (Sidebar, menu, etc.)
- **`src/components/staffprofile/`** - Staff profile related views
- **`src/layouts/`** - Page layout components (AdminLayout, AuthLayout)

### 2. **Component Naming Conventions**

- File names: PascalCase (e.g., `UserAdd.jsx`, `ListContainer.jsx`)
- Export default component with same name as file
- Keep component files focused on single responsibility

### 3. **Form Component Standards**

When creating Add/Edit forms:

- Use Material-UI TextField and other form components
- Display error messages in `--color-danger`
- Display success messages in `--color-success`
- Style form container with `background: "var(--color-gray-100)"`
- Use CRUDActions component for form action buttons

```jsx
// Error message example
{
  errorMsg && (
    <div style={{ color: "var(--color-danger)", marginTop: 8 }}>{errorMsg}</div>
  );
}

// Success message example
{
  success && (
    <div style={{ color: "var(--color-success)", marginTop: 8 }}>
      {t("basic.true")}
    </div>
  );
}
```

### 4. **Table/List Components**

Use ListContainer for standardized list UI:

- Table headers: `backgroundColor: "background.default"`
- Table rows on hover: `backgroundColor: "action.hover"`
- Table borders: `border: "1px solid var(--color-gray-300)"` or `border: "1px solid var(--color-gray-200)"`
- Use Material-UI Table components (TableContainer, Table, TableHead, TableBody, TableRow, TableCell)

---

## Internationalization (i18n)

### 1. **Translation Keys**

- All user-facing text must use the `t()` function from i18n
- Translation files located in: `src/locales/{lang}/translation.json`
- Supported languages: English (`en`), Chinese (`zh`)

Example:

```jsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t("mySection.myKey")}</h1>;
}
```

### 2. **Key Structure**

- Use hierarchical keys: `"section.subsection.key"`
- Examples: `"basic.name"`, `"user.add.title"`, `"error.invalidEmail"`
- Always add new translations to both `en` and `zh` files

---

## Material-UI Standards

### 1. **Component Usage**

- Use Material-UI v5 components for consistency
- Import from `@mui/material` (not `@material-ui/core`)
- Use `sx` prop for styling instead of `style` attribute when possible

```jsx
import { Button, Box, TextField } from "@mui/material";

<Button variant="contained" sx={{ backgroundColor: "primary.main" }}>
  Click me
</Button>;
```

### 2. **Dialog/Modal Components**

- Use Material-UI Dialog component
- Import Modal from `src/components/common/Modal` for standardized styling
- Dialogs should use theme backgrounds and padding variables

### 3. **Icons**

- Use Material-UI Icons (`@mui/icons-material`)
- Color icons with theme tokens: `<DeleteIcon sx={{ color: "error.main" }} />`

---

## Code Quality & Patterns

### 1. **Props & PropTypes**

- Define propTypes for reusable components
- Use descriptive prop names
- Document complex props with JSDoc comments

### 2. **State Management**

- Use React Context for global state (auth, user info) - see `src/context/`
- Use useState for local component state
- Avoid prop drilling; use Context when data crosses 3+ component levels

### 3. **Error Handling**

- Always handle API errors gracefully
- Display errors with semantic error colors: `var(--color-danger)` or `error.main`
- Use ErrorDialog from CRUDActions for critical errors

### 4. **API Communication**

- Use axios helpers from `src/helpers/axios_helper.js`
- Implement proper error/loading states
- Show success feedback after mutations

### 5. **File Organization**

- One component per file
- Keep helper functions in `src/helpers/`
- CSS shared across components goes in `src/styles/` (use theme.css variables)
- Component-specific CSS should be inline via `sx` prop when possible

---

## Git & Commit Standards

### 1. **Commit Messages**

- Use clear, descriptive messages
- Format: `"Category: Brief description"` or `"Feature: Description"`
- Examples:
  - `"Fix: Correct color variable reference in UserAdd"`
  - `"Feature: Add new form validation component"`
  - `"Refactor: Simplify DashBoard styling with theme tokens"`

### 2. **Code Review Standards**

- All styling changes should use theme variables or MUI tokens
- No hardcoded colors should be introduced
- High-contrast mode should be manually tested for new features
- Ensure translations added for all new user-facing text

### 3. **Commit Timing**

- Do not commit after every small change
- Only commit after completing a logical unit of work, or when instructed by developer
- Ensure code is tested and reviewed before pushing
- Use branches for features/bugfixes
- Remind the developer if they are working directly on main or master

---

## Testing & Validation

### 1. **Manual Testing Checklist**

- [ ] Feature works in light mode
- [ ] Feature works in high-contrast mode
- [ ] All text is properly translated for supported languages
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Colors meet accessibility contrast requirements

### 2. **Build & Dev**

- Build tool: Vite
- Dev server: `npm run dev` (configured in `start-dev.ps1` / `start-dev.sh`)
- Proxy setup for backend API in `src/setupProxy.js`

---

## Common Tasks & Patterns

### Adding a New Feature

1. Create component file in appropriate folder
2. Use i18n for all text (`t()` function)
3. Style with theme variables / MUI tokens (no hardcoded colors)
4. Test high-contrast mode
5. Commit with clear message

### Adding a New Color

1. Define variable in `src/styles/theme.css` (both light and high-contrast variants)
2. Use in components via `var(--color-*)` or MUI tokens
3. No inline hardcoding

### Creating a CRUD Form

1. Base on existing forms (UserAdd.jsx, RoleAdd.jsx, etc.)
2. Use Material-UI TextField for inputs
3. Use CRUDActions for form buttons
4. Display errors/success with semantic colors
5. Add all form labels and messages to i18n

### Fixing a Styling Issue

1. Check if color variable exists in `src/styles/theme.css`
2. Use existing variable or MUI token
3. If new color needed, add both light and high-contrast variants
4. Test in both light and high-contrast modes

---

## Resources

- **Theme Variables:** `src/styles/theme.css` (lines 11-94 for color definitions)
- **MUI Theme Palette:** `src/theme/businessTheme.js`
- **Translation Files:** `src/locales/{en,zh}/translation.json`
- **Common Components:** `src/components/common/`
- **Helper Functions:** `src/helpers/`
- **Material-UI Docs:** https://mui.com/

---

## Quick Reference: Color Variables

```css
/* Semantic Colors */
--color-primary          /* EkoWatt green #7ac142 */
--color-secondary
--color-success
--color-danger
--color-warning
--color-info

/* Backgrounds */
--color-white
--color-gray-100
--color-gray-200
--color-gray-300
--color-bg-alt
--color-bg-light

/* Text */
--color-dark
--color-text-primary
--color-text-secondary

/* High-contrast variants auto-applied */
/* No additional work needed; CSS handles it */
```

---

**Last Updated:** February 8, 2026  
**Project:** BMP Frontend (React + Material-UI)
