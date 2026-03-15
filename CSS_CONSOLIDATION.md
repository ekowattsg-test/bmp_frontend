# CSS & UI Component Consolidation Guide

## Overview

This document outlines the consolidated CSS theme and common UI components created to standardize styles and reduce code duplication across the application.

## File Structure

### CSS Files

- **`src/styles/theme.css`** - Centralized theme with color palette, spacing, typography, and component styles
- **`src/index.css`** - Global styles and MUI framework overrides

### Common Components Location

All common components are located in `src/components/common/` and exported via `src/components/common/index.js`

## CSS Color Palette

### Primary Colors

```css
--color-primary: #007bff;
--color-primary-hover: #0056b3;
--color-primary-light: #e7f1ff;
```

### Status Colors

```css
--color-success: #28a745;
--color-danger: #dc3545;
--color-warning: #ffc107;
--color-info: #17a2b8;
--color-merit: #4caf50;
--color-demerit: #f44336;
```

### Neutral Colors

```css
--color-dark: #333;
--color-gray-600: #555;
--color-gray-500: #666;
--color-gray-400: #999;
--color-gray-300: #ddd;
--color-gray-200: #e0e0e0;
--color-gray-100: #f5f5f5;
--color-gray-50: #f9f9f9;
--color-white: #ffffff;
```

## Common Components

### 1. ListContainer

Standardized list view with search, add, edit, and delete actions.

**Location:** `src/components/common/ListContainer.jsx`

**Usage:**

```jsx
import { ListContainer } from "../common";

<ListContainer
  title="Users"
  searchPlaceholder="Search users..."
  data={userData}
  columns={["firstName", "lastName", "email"]}
  t={t}
  onAdd={() => setShowAdd(true)}
  onEdit={(item) => handleEdit(item)}
  onDelete={(item) => handleDelete(item)}
  searchValue={search}
  onSearchChange={setSearch}
  filterFunction={customFilter}
  emptyMessage="No data available"
/>;
```

**Props:**

- `title` - Container title
- `data` - Array of items to display
- `columns` - Array of column keys to display
- `t` - i18n translation function
- `onAdd`, `onEdit`, `onDelete` - Action callbacks
- `searchValue`, `onSearchChange` - Search state
- `filterFunction` - Custom filter logic
- `enableActions` - Show action buttons (default: true)
- `emptyMessage` - Message when no data

### 2. Button

Standardized button with multiple variants and sizes.

**Location:** `src/components/common/Button.jsx`

**Usage:**

```jsx
import { Button } from '../common';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

<Button variant="success" size="sm" loading={isLoading}>
  Submit
</Button>

<Button
  variant="danger"
  icon={DeleteIcon}
  iconPosition="start"
>
  Delete
</Button>
```

**Variants:** `primary`, `secondary`, `success`, `danger`, `warning`, `info`, `outline`, `ghost`

**Sizes:** `xs`, `sm`, `md`, `lg`, `xl`

### 3. Modal

Common modal component with consistent styling and layout.

**Location:** `src/components/common/Modal.jsx`

**Usage:**

```jsx
import { Modal, ModalForm } from '../common';

<Modal
  open={isOpen}
  title="Modal Title"
  onClose={handleClose}
  maxWidth="sm"
>
  <Box>Modal content</Box>
</Modal>

<ModalForm
  open={isOpen}
  title="Form Title"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  loading={isLoading}
>
  {/* Form fields */}
</ModalForm>
```

### 4. CRUD Actions & Dialogs

Common dialogs and hooks for CRUD operations.

**Location:** `src/components/common/CRUDActions.jsx`

**Usage:**

```jsx
import { DeleteConfirmationDialog, useCRUDState } from "../common";

// Using the hook
const {
  action,
  selectedItem,
  loading,
  handleEdit,
  handleDelete,
  handleCancel,
} = useCRUDState();

// Using the dialog
<DeleteConfirmationDialog
  open={showDeleteConfirm}
  title="Confirm Delete"
  message="Are you sure?"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancel}
  loading={loading}
/>;
```

## CSS Classes

### Cards & Containers

```css
.card, .container-card /* Standard card styling */
```

### Typography

```css
.section-title      /* Large section heading */
.section-subtitle   /* Subtitle text */
.section-header     /* Header with icon and title */
```

### Buttons

```css
.btn                /* Base button */
.btn-primary        /* Primary style */
.btn-success        /* Success style */
.btn-danger         /* Danger/delete style */
.btn-secondary      /* Secondary style */
.btn-sm             /* Small size */
.btn-icon           /* Icon-only button */
```

### Forms

```css
.form-group         /* Form field wrapper */
.form-actions       /* Action buttons container */
.search-input       /* Search input field */
```

### Tables

```css
.table-container    /* Table wrapper */
.table              /* Table styling */
.table th           /* Header cells */
.table td           /* Data cells */
```

### Badges & Labels

```css
.badge              /* Base badge */
.badge-skill        /* Skill badge */
.badge-category     /* Category badge */
.badge-success      /* Success badge */
.badge-danger       /* Danger badge */
```

### Modals

```css
.modal-overlay      /* Modal background */
.modal-content      /* Modal content wrapper */
.modal-header       /* Modal header */
.modal-body         /* Modal body */
.modal-close-btn    /* Close button */
```

## Using CSS Variables

All colors and spacing use CSS variables for consistency:

```jsx
// In custom CSS
.custom-element {
  background-color: var(--color-primary);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}
```

## Refactoring List Components

When refactoring list/CRUD components, follow this pattern:

1. Import common components:

```jsx
import { ListContainer, useCRUDState } from "../common";
```

2. Use `useCRUDState` hook for state management:

```jsx
const { action, selectedItem, handleEdit, handleDelete, handleCancel } =
  useCRUDState();
```

3. Use `ListContainer` for the list view:

```jsx
<ListContainer
  title={t("list.title")}
  data={data}
  columns={["col1", "col2"]}
  t={t}
  onAdd={handleAdd}
  onEdit={handleEdit}
  onDelete={handleDelete}
  searchValue={search}
  onSearchChange={setSearch}
/>
```

4. Keep separate Add/Edit/Delete components for complex operations

## Best Practices

1. **Use CSS Variables** - Always reference color and spacing variables instead of hardcoding values
2. **Consistent Naming** - Follow the established naming conventions for classes and components
3. **Reuse Common Components** - Don't create new modal/button/list components; use existing ones
4. **Theme Consistency** - Ensure new styles align with the theme palette
5. **Responsive Design** - Theme includes responsive breakpoints; use them
6. **Type Safety** - Import from `src/components/common` for better error detection

## Migration Checklist

When consolidating a component:

- [ ] Replace inline styles with CSS classes or theme variables
- [ ] Use common Button component for all buttons
- [ ] Use common Modal component for dialogs
- [ ] Use ListContainer for list views
- [ ] Use useCRUDState for state management
- [ ] Remove duplicate CSS from component files
- [ ] Test responsive behavior
- [ ] Update i18n translations if needed
- [ ] Test all CRUD operations

## Future Improvements

- Extract remaining CSS from individual component files
- Create form builder component for standardized forms
- Add more specialized components (DataGrid wrapper, Card components)
- Document component composition patterns
