# Assets in Keleo Studio

Assets provide visual enhancements to practice elements through icons, diagrams, templates, and other visual resources.

## Asset Types

Assets are defined in the `assets` array at the document level (PracticeBaseline, Practice, or Method) and referenced by practice elements via `assetNames`.

### 1. Icon Assets

Icons appear alongside element names in visualizations (swim lanes, node headers, labels).

#### Image-based Icons

```json
{
  "name": "platform-icon",
  "description": "Platform infrastructure icon",
  "type": "icon",
  "url": "https://example.com/icons/platform.svg"
}
```

Or with data URI:

```json
{
  "name": "platform-icon",
  "type": "icon",
  "dataUri": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0i..."
}
```

#### Font-character Icons

Font-character assets enable using icon fonts like Font Awesome, Material Icons, or custom icon fonts:

```json
{
  "name": "opportunity-icon",
  "description": "Opportunity alpha icon",
  "type": "font-character",
  "fontFamily": "Font Awesome 6 Free",
  "fontCharacter": "fa-lightbulb",
  "fontWeight": "900",
  "fontUrl": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
}
```

**Font-character fields:**
- `fontFamily` (required): Font family name (e.g., "Font Awesome 6 Free", "Material Icons")
- `fontCharacter` (required): Icon identifier - CSS class (e.g., "fa-lightbulb") or Unicode (e.g., "")
- `fontWeight` (optional): Font weight - "900" (solid), "400" (regular), etc.
- `fontUrl` (optional): URL to load the font from (stylesheet or font file)

### 2. Illustrative Assets

Diagrams, images, and illustrations displayed after narrative content.

```json
{
  "name": "architecture-diagram",
  "description": "Platform architecture overview",
  "type": "diagram",
  "url": "https://example.com/diagrams/architecture.svg"
}
```

### 3. Template Assets

Reusable document templates (forms, decision records, etc.).

```json
{
  "name": "decision-record-template",
  "description": "Architecture decision record template",
  "type": "template",
  "url": "https://example.com/templates/adr.pdf"
}
```

## Referencing Assets

Practice elements reference assets via the `assetNames` array:

```json
{
  "name": "Platform",
  "description": "The infrastructure foundation",
  "focusName": "Solution",
  "assetNames": [
    {
      "assetName": "platform-icon",
      "type": "icon"
    },
    {
      "assetName": "architecture-diagram",
      "type": "diagram"
    }
  ],
  "states": [...]
}
```

**AssetReference types:**
- `icon`: Displayed to the left of element names
- `illustrative`: Displayed after narratives (centered)
- `diagram`: Displayed after narratives (centered)
- `template`: Displayed after narratives (centered)

## Dynamic Font Loading

The system automatically loads fonts declared in font-character assets:

### Known CDN Mappings

The font loader recognizes common icon fonts and automatically loads them from CDN:

- **Font Awesome**: Any font family containing "Font Awesome" → loads from cdnjs.cloudflare.com
- **Material Icons**: "Material Icons" → loads from fonts.googleapis.com
- **Material Symbols**: "Material Symbols" → loads from fonts.googleapis.com

### Custom Fonts

For custom fonts, provide `fontUrl`:

```json
{
  "name": "custom-icon",
  "type": "font-character",
  "fontFamily": "My Custom Icons",
  "fontCharacter": "custom-icon-name",
  "fontUrl": "https://mycdn.com/fonts/custom-icons.css"
}
```

The system detects:
- **Stylesheets** (`.css` or Google Fonts URLs) → loads via `<link>`
- **Font files** (`.woff2`, `.ttf`, etc.) → loads via `@font-face`

## Where Icons Appear

### Visualizations

1. **Kanban Pattern Board** ([KanbanPatternBoardPF](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/components/KanbanPatternBoardPF.tsx:0:0-0:0))
   - Alpha swim lane headers (left of alpha name)
   - Work product swim lane headers (left of work product name)

2. **Topology Diagram** ([TopologyDiagram](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/components/TopologyDiagram.tsx:0:0-0:0))
   - Compound node headers (top-left corner)
   - Alpha and work product cards

3. **Sankey Flow Diagram** ([SankeyFlowDiagram](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/components/SankeyFlowDiagram.tsx:0:0-0:0))
   - Node labels (left of text)
   - Alpha state and work product nodes

4. **Progressive Flow Diagram** ([ProgressiveFlowDiagram](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/components/ProgressiveFlowDiagram.tsx:0:0-0:0))
   - Alpha state nodes (top-left corner)

## Example: Complete Asset Configuration

```json
{
  "name": "Platform Adoption Essentials",
  "kind": "baseline",
  "alphas": [
    {
      "name": "Platform",
      "description": "The infrastructure foundation",
      "focusName": "Solution",
      "assetNames": [
        {
          "assetName": "platform-icon",
          "type": "icon"
        },
        {
          "assetName": "platform-architecture",
          "type": "diagram"
        }
      ],
      "states": [...]
    }
  ],
  "assets": [
    {
      "name": "platform-icon",
      "description": "Platform infrastructure icon",
      "type": "font-character",
      "fontFamily": "Font Awesome 6 Free",
      "fontCharacter": "fa-cubes",
      "fontWeight": "900",
      "fontUrl": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    },
    {
      "name": "platform-architecture",
      "description": "Platform architecture diagram",
      "type": "diagram",
      "url": "https://example.com/diagrams/platform.svg"
    }
  ]
}
```

## Supported Icon Fonts

### Font Awesome 6

```json
{
  "type": "font-character",
  "fontFamily": "Font Awesome 6 Free",
  "fontCharacter": "fa-lightbulb",
  "fontWeight": "900"
}
```

**Font weights:**
- `900`: Solid style (fa-solid)
- `400`: Regular style (fa-regular)

**Icon names**: Use the class name format (e.g., `fa-lightbulb`, `fa-users`, `fa-chart-line`)

See: https://fontawesome.com/icons

### Material Icons

```json
{
  "type": "font-character",
  "fontFamily": "Material Icons",
  "fontCharacter": "settings"
}
```

**Icon names**: Use the ligature name (e.g., `settings`, `home`, `dashboard`)

See: https://fonts.google.com/icons

### Custom Icon Fonts

Provide your own icon font by specifying `fontUrl`:

```json
{
  "type": "font-character",
  "fontFamily": "My Icons",
  "fontCharacter": "icon-name",
  "fontUrl": "https://mysite.com/fonts/my-icons.woff2"
}
```

## Current Limitations

1. **Local file paths not supported**: Only externally referenceable assets (URL, dataUri, fontUrl) are currently supported
2. **Narrative asset display**: Utility functions exist (`getNarrativeAssets`) but UI rendering is not yet implemented
3. **SVG foreignObject**: Font icons in SVG use `foreignObject` which may have limited browser support in older browsers

## Implementation Details

- **Font loader**: [fontLoader.ts](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/lib/fontLoader.ts:0:0-0:0)
- **Asset utilities**: [assetUtils.ts](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/lib/assetUtils.ts:0:0-0:0)
- **Icon components**: [IconAsset.tsx](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/components/IconAsset.tsx:0:0-0:0)
- **SVG rendering**: [renderIconInSvg.ts](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/lib/renderIconInSvg.ts:0:0-0:0)
- **Type definitions**: [types.ts](cci:7://file:///Users/eseymour/code/keleo-studio/web/src/lib/types.ts:0:0-0:0)
- **JSON Schema**: [language.schema.json](cci:7://file:///Users/eseymour/code/keleo-studio/web/public/language.schema.json:0:0-0:0)
