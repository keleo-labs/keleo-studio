# Recursive Alpha Tree Implementation

## Overview
Updated the Navigator component to support multi-level alpha hierarchies (sub-sub-alphas and beyond) in both the sidebar tree view and the overview diagram.

## Changes Made

### 1. NavigatorSidebar.tsx
**Location:** `/web/src/components/navigator/NavigatorSidebar.tsx`

#### Added Recursive Function
```typescript
const renderAlphaTree = (
  alphas: PracticeBaseline["alphas"],
  parentName: string | null,
  depth: number = 0
): JSX.Element[]
```

**Purpose:** Recursively renders alpha hierarchies at any depth level.

**Key Features:**
- Filters alphas by `contributesTo` to find children of a parent
- Checks recursively if each alpha has its own children
- Adjusts styling based on depth:
  - Font size: `0.8125rem` for root level, `0.75rem` for children
  - Icon size: `16px` for root level, `14px` for children
- Maintains expansion/collapse state at all levels
- Proper indentation: `1.5rem` per level

#### Updated Usage
Replaced the flat single-level child rendering (lines 554-609) with:
```typescript
renderAlphaTree(group.alphas, element.name, 0)
```

### 2. OverviewDiagram.tsx
**Location:** `/web/src/components/navigator/OverviewDiagram.tsx`

#### Added Recursive Function
```typescript
const renderAlphaTree = (
  parentAlphaName: string,
  depth: number,
  allAlphas: typeof baseline.alphas,
  focusName: string,
  rootScoreEntry: any
): JSX.Element | null
```

**Purpose:** Recursively renders alpha hierarchies with connecting lines in the overview diagram.

**Key Features:**
- Generates connecting lines at each depth level
- **Vertical connector line:**
  - Position: `left: ${1.3125 + (depth * 2.625)}rem`
  - Adjusts position based on depth to align with parent
- **Horizontal connector line:**
  - Position: `left: ${1.3125 + (depth * 2.625)}rem`
  - Connects child to vertical line at appropriate depth
- **Card indentation:**
  - Padding: `paddingLeft: ${2.625 + (depth * 2.625)}rem`
  - Increases by `2.625rem` per level
- Recursively looks up scores for nested alphas
- Supports unlimited depth

#### Recursive Score Lookup
Added nested function to find scores in the tree:
```typescript
const findScoreRecursive = (alphas: any[]): number => {
  for (const na of alphas) {
    if (na.alpha.name === child.name) {
      return na.score;
    }
    if (na.newAlphas) {
      const score = findScoreRecursive(na.newAlphas);
      if (score > 0) return score;
    }
  }
  return 0;
};
```

## Visual Hierarchy

### Sidebar Tree
```
▸ Focus Area
  ▸ Root Alpha (16px icon, 0.8125rem font)
      ▸ Sub-Alpha (14px icon, 0.75rem font)
          ▸ Sub-Sub-Alpha (14px icon, 0.75rem font)
              Sub-Sub-Sub-Alpha (14px icon, 0.75rem font)
```

### Overview Diagram
```
Root Alpha
│
├─ Sub-Alpha-1
│  │
│  ├─ Sub-Sub-Alpha-1
│  └─ Sub-Sub-Alpha-2
│
└─ Sub-Alpha-2
   │
   └─ Sub-Sub-Alpha-3
      │
      └─ Sub-Sub-Sub-Alpha-1
```

## Connecting Lines Logic

### Line Positioning Formula
For depth `d` (0-indexed):
- Vertical line left position: `1.3125 + (d * 2.625)` rem
- Horizontal line left position: `1.3125 + (d * 2.625)` rem
- Card padding left: `2.625 + (d * 2.625)` rem

### Example at Different Depths
| Depth | Vertical Line Left | Horizontal Line Left | Card Padding Left |
|-------|-------------------|---------------------|-------------------|
| 0     | 1.3125rem         | 1.3125rem           | 2.625rem          |
| 1     | 3.9375rem         | 3.9375rem           | 5.25rem           |
| 2     | 6.5625rem         | 6.5625rem           | 7.875rem          |
| 3     | 9.1875rem         | 9.1875rem           | 10.5rem           |

## Testing

### How to Test
1. Navigate to the Navigator view in the application
2. Switch to "Concerns" mode
3. Find an alpha that has sub-alphas (check `contributesTo` property)
4. Expand the alpha tree to verify:
   - All levels display correctly
   - Connecting lines align properly
   - Selection works at all levels
   - Icons and fonts scale appropriately

### Test Cases
- [x] Single-level hierarchy (root → child)
- [x] Two-level hierarchy (root → child → grandchild)
- [x] Three+ level hierarchy (root → child → grandchild → great-grandchild)
- [x] Multiple children at same level
- [x] Mixed depths in same focus area
- [x] Selection state at all levels
- [x] Expansion/collapse state persistence

## Architecture Benefits

### Before
- Hard-coded single level of sub-alphas
- Non-recursive rendering
- Limited to 2 levels total (root + children)

### After
- Fully recursive alpha tree
- Supports unlimited depth
- Clean separation of concerns
- Consistent styling and interaction at all levels
- Proper connecting lines at every depth

## Related Files
- `/web/src/components/navigator/NavigatorSidebar.tsx` - Tree navigation
- `/web/src/components/navigator/OverviewDiagram.tsx` - Visual overview
- `/web/src/lib/types.ts` - Alpha type definitions
