# Navigation Sidebar Improvements

## Overview
Enhanced the fixed navigation sidebars in both BrowseView and ProjectManagementView to provide detailed hierarchical navigation through large documents.

## Changes Made

### BrowseView Navigation
The sidebar now shows:
- **Report Outline** (top-level link)
- **1. Executive Context** (top-level link)
- **2. Method Focus** (top-level link)
- **3. Lifecycle Orchestration** ▼ (expandable)
  - Pattern 1
  - Pattern 2
  - ...
- **4. Core Concepts** ▼ (expandable)
  - Alpha 1
  - Alpha 2
  - ...
- **5. Evidentiary Artifacts** ▼ (expandable)
  - Work Product 1
  - Work Product 2
  - ...
- **6. Execution & Roles** ▼ (expandable)
  - Activity Space 1
  - Activity Space 2
  - ...

### ProjectManagementView Navigation
The sidebar now shows:
- **1. Strategic Context** (top-level link)
- **2. Lifecycle & Phasing** ▼ (expandable)
  - Pattern 1
  - Pattern 2
  - ...
- **3. Milestones** ▼ (expandable)
  - Alpha 1
  - Alpha 2
  - ...
- **4. Teams & Activities** ▼ (expandable)
  - Team 1
  - Team 2
  - ...

## Features

### 1. Hierarchical Navigation
- Main sections are always visible
- Subsections (patterns, alphas, work products, etc.) can be expanded/collapsed
- Click the arrow (▼/▶) or section header to toggle expansion
- Default: all sections expanded for easy access

### 2. Smooth Scrolling
- Clicking any link smoothly scrolls to that section
- Uses CSS `scroll-behavior: smooth` for native browser smooth scrolling

### 3. Active Section Highlighting
- The current section is highlighted in blue
- Bold font and left border indicator show your position
- Updates automatically as you scroll through the document
- 100px offset ensures accurate highlighting near the top of the page

### 4. Fixed Positioning
- Sidebar stays visible as you scroll
- `position: sticky` with `top: 0`
- Full viewport height (`height: 100vh`)
- Independent scrolling if sidebar content is too tall

### 5. Visual Feedback
- Hover effects on all links
- Smooth transitions for all state changes
- Color coding:
  - Active section: Primary blue
  - Main sections: Default text color
  - Subsections: Lighter gray text color

## Technical Implementation

### State Management
```typescript
const [expandedSections, setExpandedSections] = useState<Set<string>>(
  new Set(["lifecycle", "alphas", "workproducts", "activities"])
);
const [activeSection, setActiveSection] = useState<string>("");
```

### Scroll Tracking
```typescript
useEffect(() => {
  const handleScroll = () => {
    const sections = ["outline", "executive-context", ...];
    const scrollPosition = window.scrollY + 100;
    
    for (let i = sections.length - 1; i >= 0; i--) {
      const element = document.getElementById(sections[i]);
      if (element && element.offsetTop <= scrollPosition) {
        setActiveSection(sections[i]);
        break;
      }
    }
  };
  
  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

### Dynamic Styling
```typescript
const navItemStyle = (isActive: boolean = false): CSSProperties => ({
  color: isActive ? "var(--pf-v6-global--primary-color--100)" : "...",
  borderLeft: isActive ? "3px solid var(--pf-v6-global--primary-color--100)" : "...",
  fontWeight: isActive ? 600 : 400,
});
```

## Benefits

1. **Improved Navigation**: Users can quickly jump to any section or subsection
2. **Better Orientation**: Active section highlighting shows current position
3. **Space Efficient**: Collapsible sections reduce visual clutter
4. **Accessibility**: Semantic HTML with proper anchor links
5. **Responsive**: Works on different screen sizes (sidebar is 300px wide)
6. **Performance**: Efficient scroll listeners with proper cleanup

## Testing

To test the navigation:
1. Open BrowseView or ProjectManagementView with a practice that has multiple sections
2. Scroll through the document and observe active section highlighting
3. Click different navigation links to jump to sections
4. Toggle section expansion/collapse
5. Verify smooth scrolling behavior

## Future Enhancements

Possible improvements:
- Persist expanded/collapsed state in localStorage
- Add keyboard navigation (arrow keys)
- Add search/filter within navigation
- Show item counts next to expandable sections
- Add "scroll to top" button
- Make sidebar width configurable
