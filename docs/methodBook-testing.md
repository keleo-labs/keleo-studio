# Method Book Testing Guide

## Quick Test Commands

### Start Development Server
```bash
cd web
npm run dev
```

### Test Pattern Organizer (Default)
```bash
# JSON structure
curl -s "http://localhost:3000/api/test-book" | jq .

# Readable output
curl -s "http://localhost:3000/api/test-book" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Series: {data[\"structure\"][\"series\"][\"title\"]}')
print(f'Volumes: {data[\"structure\"][\"series\"][\"totalVolumes\"]}')
for vol in data['structure']['volumes']:
    print(f'\nVolume {vol[\"index\"]}: {vol[\"title\"]}')
    for part in vol['parts']:
        print(f'  - {part[\"heading\"]} ({part[\"chapters\"]} chapters)')
"
```

### Test MethodBook Organizer (New)
```bash
# JSON structure
curl -s "http://localhost:3000/api/test-book?organizingPrinciple=methodBook" | jq .

# Readable output
curl -s "http://localhost:3000/api/test-book?organizingPrinciple=methodBook" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Series: {data[\"structure\"][\"series\"][\"title\"]}')
print(f'Volumes: {data[\"structure\"][\"series\"][\"totalVolumes\"]}')
for vol in data['structure']['volumes']:
    print(f'\nVolume {vol[\"index\"]}: {vol[\"title\"]}')
    for part in vol['parts']:
        print(f'  PART: {part[\"heading\"]} ({part[\"chapters\"]} chapters)')
        for ch in part.get('chapterDetails', []):
            print(f'    - {ch[\"heading\"]} ({ch[\"sections\"]} sections)')
"
```

### Side-by-Side Comparison
```bash
#!/bin/bash

echo "=== PATTERN ORGANIZER ==="
curl -s "http://localhost:3000/api/test-book?organizingPrinciple=pattern" | \
  python3 -c "import json,sys; data=json.load(sys.stdin); vol=data['structure']['volumes'][1]; \
  print(f'{vol[\"title\"]}\n'); \
  [print(f'  {p[\"heading\"]}\n    Chapters: {p[\"chapters\"]}') for p in vol['parts'] if p['kind']=='part']"

echo -e "\n=== METHODBOOK ORGANIZER ==="
curl -s "http://localhost:3000/api/test-book?organizingPrinciple=methodBook" | \
  python3 -c "import json,sys; data=json.load(sys.stdin); vol=data['structure']['volumes'][1]; \
  print(f'{vol[\"title\"]}\n'); \
  [print(f'  {p[\"heading\"]}\n    Chapters: {p[\"chapters\"]}') for p in vol['parts'] if p['kind']=='part']"
```

---

## Expected Output

### Pattern Organizer
```
Volume 1: 7S Alignment Journey
  PART: Systemic Alignment Pattern (5 chapters)
    - Prerequisites (0 sections)
    - Diagnosis (2 sections)
    - Design (2 sections)
    - Execution (2 sections)
    - Optimization (2 sections)
```

### MethodBook Organizer
```
Volume 1: 7S Alignment Journey
  PART: VALUE ARCHITECTURE (1 chapters)
    - Timeline Phases & Horizon Maps (Patterns) (1 sections)
  PART: ENDEAVOR MANAGEMENT & OPERATIONS (1 chapters)
    - Operational Playbooks (Activities) (5 sections)

Volume 2: Skills Element
  PART: VALUE ARCHITECTURE (1 chapters)
    - Timeline Phases & Horizon Maps (Patterns) (1 sections)
  PART: SOLUTION ARCHITECTURE (1 chapters)
    - Concerns & Progression Tracks (Alphas) (1 sections)
  PART: ENDEAVOR MANAGEMENT & OPERATIONS (1 chapters)
    - Operational Playbooks (Activities) (6 sections)
```

---

## Key Differences

| Aspect | Pattern Organizer | MethodBook Organizer |
|--------|------------------|---------------------|
| **Structure** | Pattern-driven (temporal) | Template-driven (concern-based) |
| **Parts** | One per pattern | Fixed 3-part structure (VALUE, SOLUTION, ENDEAVOR) |
| **Chapters** | Pattern views | Fixed chapter titles per part |
| **Best for** | Sequential/lifecycle practices | Cognitive ergonomics framework |
| **Flexibility** | Adapts to practice structure | Fixed template regardless of practice |

---

## PDF Generation Test

### Generate PDF with MethodBook Organizer
```bash
curl -X POST http://localhost:3000/api/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "doc": {...},
    "bookMode": true,
    "organizingPrinciple": "methodBook",
    "methodComposition": {...}
  }' \
  --output test-methodbook.pdf
```

### Generate PDF with Pattern Organizer
```bash
curl -X POST http://localhost:3000/api/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "doc": {...},
    "bookMode": true,
    "organizingPrinciple": "pattern",
    "methodComposition": {...}
  }' \
  --output test-pattern.pdf
```

---

## Validation Checklist

### Structure Validation
- [ ] All volumes have correct metadata
- [ ] Front matter includes title page and TOC
- [ ] Body parts follow organizing principle structure
- [ ] Back matter includes appendices (final volume only)
- [ ] Page breaks occur at part/chapter boundaries

### Content Validation (MethodBook)
- [ ] PART I contains patterns as lifecycle roadmaps
- [ ] PART II contains alphas grouped by focus
- [ ] PART III contains activity spaces and activities
- [ ] Empty parts are omitted (e.g., no alphas → no PART II)

### Cross-Reference Validation
- [ ] First mentions have full descriptions
- [ ] Subsequent mentions link back to first mention
- [ ] Element registry tracks across volumes
- [ ] TOC links to correct sections

### HTML Rendering Validation
- [ ] All headings render with correct hierarchy (h1-h6)
- [ ] Tables format correctly
- [ ] Bullets and lists render properly
- [ ] Formulas/special characters escape correctly
- [ ] CSS styling matches theme

---

## Troubleshooting

### Issue: Empty Parts
**Symptom:** Volume has no PART II or PART III
**Cause:** Practice missing alphas or activities
**Fix:** This is expected behavior - organizer omits empty parts

### Issue: Wrong Organizer Used
**Symptom:** Structure doesn't match methodBook template
**Cause:** `organizingPrinciple` parameter not passed or incorrect
**Fix:** Verify query param or request body includes `organizingPrinciple: "methodBook"`

### Issue: Missing Content
**Symptom:** Sections are empty
**Cause:** Practice elements missing descriptions or content
**Fix:** Add descriptions to patterns, alphas, activities in source JSON

### Issue: Build Time Slow
**Symptom:** Book generation takes > 1 second
**Cause:** Complex practice with many elements
**Fix:** This is expected - pattern organizer renders more detail per element

---

## Performance Benchmarks

Expected build times (development mode):
- Pattern organizer: 1-5ms per practice
- MethodBook organizer: 1-3ms per practice (simpler structure)
- Full method (2 practices): < 10ms total

PDF generation adds ~500-2000ms for Playwright rendering.

---

## Next Steps

After validating the implementation:

1. **Test with real practices** - Load full practice library
2. **Validate PDF output** - Verify rendering in multiple PDF viewers
3. **User acceptance** - Review with stakeholders
4. **Documentation** - Update user guides with new organizer option
5. **UI integration** - Add organizer selector to method builder UI
