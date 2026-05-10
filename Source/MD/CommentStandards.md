# Code Commenting Standards

This document outlines the standard for writing comments in the codebase to ensure consistency and readability.

## 1. File & Major Section Headers
Use a box-style comment to denote the start of a file or a major section within a file. This helps in quickly identifying the purpose of the file or large blocks of code.

**Format:**
```css
/* =========================================
   [Section Name]
   ========================================= */
```

**Example:**
```css
/* =========================================
   Drag Line Layout
   ========================================= */
```

## 2. Component Documentation Headers
For complex components, include a detailed header block describing the file's purpose, layout, features, and usage.

**Format:**
```css
/*
 * [Component Name]
 * File: [filename]
 * Purpose: [Description]
 * Layout: [Layout details]
 * Features: [Key features]
 * Usage: [How to use]
 */
```

**Example:**
```css
/*
 * Drag Line Component
 * File: dragLine.css
 * Purpose: Defines the draggable divider component between panels.
 * Layout: Vertical and Horizontal splitters.
 * Features: Visual indicators, hover/active states, theme compatibility.
 */
```

## 3. Module/Block Dividers
Use a single-line comment to separate logical blocks or modules within a section. This provides a clear visual separation between different functional groups.

**Format:**
```css
/* [Module Name] */
```

**Example:**
```css
/* User Requested Styles */
/* Interaction */
/* Visuals */
```

## 4. Inline/Line-End Comments
Use inline comments at the end of a line to explain specific values, logic, or reasoning. Keep them concise.

**Format:**
```css
[Code]; /* [Explanation] */
```

**Example:**
```css
width: 10px; /* Increased hit area */
margin-left: -4px; /* Negative margin to maintain 2px layout width */
```

## 5. File Naming Conventions
Adhere to the following naming conventions for files and directories to maintain structure.

- **Files (CSS, JS, HTML, etc.)**: Use **camelCase**.
  - Format: `fileName.ext`
  - Example: `dragLine.css`, `mainPanelContainer.css`, `unsavedChangesDialog.html`

- **Directories**: Use **PascalCase**.
  - Format: `DirectoryName`
  - Example: `Source`, `MainWindowContainer`, `TitleBar`

## 6. Variable Naming Conventions
Adhere to the following naming conventions for variables, functions, and classes.

- **Variables & Properties**: Use **camelCase**.
  - Format: `variableName`
  - Example: `activeTabId`, `contentContainer`, `isOpeningFile`
  - *Recommendation*: Use descriptive names. For booleans, prefix with `is`, `has`, or `should`.

- **Constants**: Use **UPPER_SNAKE_CASE** for global/static constants, **camelCase** for local constants.
  - Example: `MAX_RETRY_COUNT`, `defaultConfig`

- **Functions & Methods**: Use **camelCase**.
  - Format: `functionName()`
  - Example: `init()`, `addTab()`, `resizeToFit()`
  - *Recommendation*: Start with a verb (e.g., `get`, `set`, `create`, `update`).

- **Classes**: Use **PascalCase**.
  - Format: `ClassName`
  - Example: `TabManager`, `InputComponent`

- **DOM Elements**: Use **camelCase**, preferably with a prefix or suffix indicating the element type.
  - Example: `btnClose`, `mainPanel`, `fileNameInput`

## 7. JavaScript Guidelines
Annotate the functionality of code blocks (functions, classes, complex logic) to clarify their purpose.

**Format:**
```javascript
/* [Functionality Description] */
[Code Block]
```

**Example:**
```javascript
/* Initialize Components */
const fileNameInput = new InputComponent('#input-file-name');

/* Auto-resize window to fit content */
const resizeToFit = () => { ... };
```

## 8. HTML Guidelines
Annotate the purpose of referenced files (CSS stylesheets, JS scripts) to explain their role in the page.

**Format:**
```html
<!-- [Description] -->
<link ...>
<script ...>
```

**Example:**
```html
<!-- System CSS -->
<link rel="stylesheet" href="Source/CSS/Basic/System/Theme/theme.css">

<!-- Component Scripts -->
<script src="Source/JS/Components/inputComponent.js"></script>
```


