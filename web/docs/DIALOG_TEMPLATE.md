# Custom Dialog/Modal Template Specification

## Overview

This template defines the standard pattern for dialogs/modals in the Keleo Studio web application. It uses a custom div-based implementation rather than PatternFly's Modal component, providing better control over layout and scrolling behavior.

**Reference implementation**: `LibraryAddModal` in `/web/src/app/library/LibraryBrowser.tsx` (lines 972-1454)

## Why Custom Instead of PatternFly Modal?

- **Better height control**: PatternFly Modal doesn't handle tall content with tabs/forms reliably
- **Predictable scrolling**: Content scrolls, buttons stay visible
- **Consistent look**: Matches our design system while using PatternFly tokens
- **Flexible layout**: Easy to customize three-part structure (header, content, footer/buttons)

## Structure

```tsx
import { useState, useEffect, type FormEvent } from "react";
import { Title } from "@patternfly/react-core";

interface MyDialogProps {
  open: boolean;
  onClose: () => void;
  // ... other props
}

export function MyDialog({ open, onClose }: MyDialogProps) {
  // State management
  const [formData, setFormData] = useState({});

  // Escape key and body overflow handling
  useEffect(() => {
    if (!open) return;
    
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Form submission
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Handle form submission
    onClose();
  }

  if (!open) return null;

  return (
    <div style={{...OVERLAY_CONTAINER_STYLE}}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        style={{...BACKDROP_STYLE}}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-heading"
        style={{...DIALOG_BOX_STYLE}}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header (fixed) */}
        <div style={{...HEADER_STYLE}}>
          <Title headingLevel="h2" size="lg" id="dialog-heading">
            Dialog Title
          </Title>
          <button
            type="button"
            onClick={onClose}
            style={{...CLOSE_BUTTON_STYLE}}
          >
            Close
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{...CONTENT_STYLE}}>
          <form onSubmit={onSubmit}>
            {/* Form content goes here */}
            
            {/* Action buttons at bottom */}
            <div style={{...BUTTON_CONTAINER_STYLE}}>
              <button
                type="button"
                onClick={onClose}
                style={{...SECONDARY_BUTTON_STYLE}}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{...PRIMARY_BUTTON_STYLE}}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

## Style Constants

### Overlay Container
```tsx
const OVERLAY_CONTAINER_STYLE = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};
```

### Backdrop
```tsx
const BACKDROP_STYLE = {
  position: "absolute" as const,
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(2px)",
  border: "none",
  cursor: "pointer",
};
```

### Dialog Box
```tsx
const DIALOG_BOX_STYLE = {
  position: "relative" as const,
  zIndex: 10,
  display: "flex",
  maxHeight: "min(90vh, 42rem)", // CRITICAL: Constrains total height
  width: "100%",
  maxWidth: "32rem", // Adjust based on content needs (32rem=small, 48rem=large)
  flexDirection: "column" as const, // CRITICAL: Enables flex children
  borderRadius: "var(--pf-v6-global--BorderRadius--lg)",
  border: "1px solid var(--pf-v6-global--BorderColor--100)",
  backgroundColor: "var(--pf-v6-global--BackgroundColor--100)",
  boxShadow: "var(--pf-v6-global--BoxShadow--xl)",
};
```

**Size guidelines**:
- Small dialogs (forms with 3-5 fields): `maxWidth: "32rem"`
- Medium dialogs (typical forms): `maxWidth: "40rem"`
- Large dialogs (complex forms with tabs): `maxWidth: "48rem"`
- Extra large (wide content): `maxWidth: "64rem"`

### Header
```tsx
const HEADER_STYLE = {
  display: "flex",
  flexShrink: 0, // CRITICAL: Prevents header from shrinking
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "0.75rem",
  borderBottom: "1px solid var(--pf-v6-global--BorderColor--100)",
  padding: "0.75rem 1rem",
};
```

### Scrollable Content
```tsx
const CONTENT_STYLE = {
  minHeight: 0, // CRITICAL: Allows flex child to shrink below content size
  flex: 1, // CRITICAL: Takes remaining space after header
  overflowY: "auto" as const, // CRITICAL: Enables scrolling
  padding: "1rem",
};
```

**Why these properties matter**:
- `minHeight: 0`: Without this, the flex child won't shrink below its content height
- `flex: 1`: Makes the content take all available space
- `overflowY: "auto"`: Enables scrolling when content exceeds available space

### Buttons Container
```tsx
const BUTTON_CONTAINER_STYLE = {
  display: "flex",
  flexWrap: "wrap" as const,
  alignItems: "center",
  gap: "0.75rem",
  paddingTop: "1rem",
  marginTop: "1rem",
  borderTop: "1px solid var(--pf-v6-global--BorderColor--100)",
};
```

### Close Button (Header)
```tsx
const CLOSE_BUTTON_STYLE = {
  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
  border: "1px solid transparent",
  padding: "0.25rem 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--pf-v6-global--Color--200)",
  backgroundColor: "transparent",
  cursor: "pointer",
};
```

### Primary Button
```tsx
const PRIMARY_BUTTON_STYLE = {
  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
  border: "1px solid var(--pf-v6-global--primary-color--100)",
  backgroundColor: "var(--pf-v6-global--primary-color--100)",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "white",
  cursor: "pointer",
};
```

### Secondary Button
```tsx
const SECONDARY_BUTTON_STYLE = {
  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
  border: "1px solid var(--pf-v6-global--BorderColor--100)",
  backgroundColor: "transparent",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "var(--pf-v6-global--Color--100)",
  cursor: "pointer",
};
```

### Danger/Delete Button
```tsx
const DANGER_BUTTON_STYLE = {
  borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
  border: "1px solid #C9190B",
  backgroundColor: "#C9190B",
  padding: "0.5rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#FFFFFF",
  cursor: "pointer",
};
```

## Common Patterns

### With Tabs
```tsx
import { Tabs, Tab, TabTitleText } from "@patternfly/react-core";

// Inside content div:
<Tabs
  activeKey={activeTab}
  onSelect={(_event, tabIndex) => setActiveTab(Number(tabIndex))}
  style={{ marginTop: "1rem" }}
>
  <Tab eventKey={0} title={<TabTitleText>Tab 1</TabTitleText>}>
    <div style={{ padding: "1rem 0" }}>
      {/* Tab 1 content */}
    </div>
  </Tab>
  <Tab eventKey={1} title={<TabTitleText>Tab 2</TabTitleText>}>
    <div style={{ padding: "1rem 0" }}>
      {/* Tab 2 content */}
    </div>
  </Tab>
</Tabs>
```

### With Busy/Loading State
```tsx
const [busy, setBusy] = useState(false);

// On submit button:
<button
  type="submit"
  disabled={busy}
  style={{
    ...PRIMARY_BUTTON_STYLE,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.5 : 1,
  }}
>
  {busy ? "Saving..." : "Save"}
</button>
```

### With Error Display
```tsx
const [error, setError] = useState<string | null>(null);

// Before buttons:
{error && (
  <p style={{ 
    fontSize: "0.75rem", 
    color: "var(--pf-v6-global--danger-color--100)",
    marginTop: "1rem",
  }}>
    {error}
  </p>
)}
```

### Reset State on Close
```tsx
useEffect(() => {
  if (!open) {
    // Reset form state when dialog closes
    setFormData({});
    setError(null);
    setBusy(false);
  }
}, [open]);
```

## Accessibility Checklist

- [ ] `role="dialog"` on dialog div
- [ ] `aria-modal="true"` on dialog div
- [ ] `aria-labelledby` pointing to title id
- [ ] Title has unique `id` attribute
- [ ] Escape key closes dialog
- [ ] Backdrop click closes dialog
- [ ] `aria-label="Close dialog"` on backdrop button
- [ ] Body overflow hidden when dialog open
- [ ] Focus management (optional, for complex dialogs)

## PatternFly Design Tokens Reference

### Colors
- `--pf-v6-global--Color--100`: Primary text color
- `--pf-v6-global--Color--200`: Secondary/muted text color
- `--pf-v6-global--BackgroundColor--100`: Default background
- `--pf-v6-global--BackgroundColor--200`: Secondary background (panels, hover states)
- `--pf-v6-global--BorderColor--100`: Border color
- `--pf-v6-global--primary-color--100`: Primary brand color (buttons, links)
- `--pf-v6-global--danger-color--100`: Error/danger color
- `--pf-v6-global--link--Color`: Link color

### Spacing & Layout
- `--pf-v6-global--BorderRadius--sm`: Small border radius
- `--pf-v6-global--BorderRadius--lg`: Large border radius
- `--pf-v6-global--BoxShadow--xl`: Extra large shadow

## Testing Checklist

- [ ] Dialog opens and closes correctly
- [ ] Escape key closes dialog
- [ ] Backdrop click closes dialog
- [ ] Content scrolls when it exceeds available height
- [ ] Buttons remain visible (at bottom of scroll area)
- [ ] Form submits correctly
- [ ] Validation errors display
- [ ] Loading/busy states work
- [ ] Dialog resets state on close
- [ ] Works on mobile viewport (320px width)
- [ ] Works on large viewport (1920px width)
- [ ] Tab navigation works (if applicable)

## Common Mistakes to Avoid

1. **Don't use PatternFly `<Modal>` component** - Use this custom pattern instead
2. **Don't put buttons in a separate footer div** - They should be inside the scrollable content at the bottom
3. **Don't forget `minHeight: 0` on content div** - Without it, flexbox won't allow scrolling
4. **Don't use `calc()` for heights** - Use `min(90vh, 42rem)` pattern instead
5. **Don't forget to prevent body scroll** - Set `document.body.style.overflow = "hidden"`
6. **Don't forget `onMouseDown={(e) => e.stopPropagation()}`** - Prevents backdrop click from triggering when clicking dialog

## Examples in Codebase

- **LibraryAddModal** (`/web/src/app/library/LibraryBrowser.tsx:972-1454`): Form with paste/upload modes
- **DeleteConfirmModal** (`/web/src/app/library/LibraryBrowser.tsx:1456-1637`): Simple confirmation dialog
- **DashboardSectionEditor** (`/web/src/components/DashboardSectionEditor.tsx`): Complex form with tabs

## Customization Notes

Feel free to adjust:
- `maxWidth` based on content needs
- `maxHeight` for shorter/taller dialogs (but keep the `min()` pattern)
- Button order (primary on right is convention)
- Padding values for tighter/looser spacing
- Form layout inside content area

Keep consistent:
- The three-part structure (header, content, buttons)
- The critical flexbox properties (`flex: 1`, `minHeight: 0`, `flexShrink: 0`)
- PatternFly design tokens for colors and spacing
- Accessibility attributes
- Escape key and backdrop handlers
