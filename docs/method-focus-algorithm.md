# Method Focus View Algorithm

## Overview

The Method Focus view displays a visual representation of how well a practice or method covers the baseline alphas. Each alpha is shaded based on a calculated score that reflects the richness of content supporting that alpha.

## Purpose

This algorithm provides a quick visual assessment of:
- Which areas of the baseline are well-covered by the practice/method
- Which areas need more attention or development
- The relative depth of coverage across different concerns

## Data Structures

### Input
- **Source Document**: The practice or method being analyzed
- **Baseline**: The resolved baseline practice (kernel) with all alphas
- **Grouped Structure**: Alphas and activities organized by focus

### Output
- **Map<FocusName, FocusGroup>**: Alphas grouped by focus with calculated scores

```typescript
interface AlphaScore {
  alpha: Alpha;
  focusName: string;
  score: number;
  newAlphas?: Array<{ alpha: Alpha; score: number }>;
}

interface FocusGroup {
  focusObj: Focus;
  alphas: AlphaScore[];
}
```

## Algorithm

### Step 1: Build Extension Alpha Map

```
FOR each focus in grouped structure:
  FOR each alpha in focus.alphas:
    IF alpha has contributesTo property:
      Add to extensionAlphasMap with:
        - key: alpha.name
        - value: { alpha, contributesTo: parent alpha name }
```

**Purpose**: Identify which alphas are extensions of baseline alphas (contributing alphas)

---

### Step 2: Build Baseline Alpha Map

```
Get baselineGrouped = groupByFocus(baseline)
Initialize baselineAlphaMap

FOR each alpha in baseline.alphas:
  IF alpha is NOT in extensionAlphasMap:
    Add to baselineAlphaMap with:
      - key: alpha.name
      - value: { alpha, focusName: alpha.focusName }
```

**Purpose**: Create a complete map of root alphas from the baseline (excluding any that are extensions)

**Critical**: This ensures ALL baseline alphas are shown, even if not referenced in the extension practice

---

### Step 3: Collect Work Products

```
Initialize workProducts array

IF source document is a Practice:
  workProducts = doc.workProducts
ELSE IF source document is a Method:
  FOR each practice in doc.practices:
    workProducts += practice.workProducts
```

**Purpose**: Gather all work products from the source document (handling both practices and methods)

---

### Step 4: Collect Activities

```
Initialize activities array

FOR each focus in grouped structure:
  FOR each activitySpace in focus.activitySpaces:
    activities += activitySpace.activities
```

**Purpose**: Gather all activities from the grouped structure

---

### Step 5: Initialize Scores

```
Initialize scores map

FOR each baselineAlpha in baselineAlphaMap:
  scores[alpha.name] = {
    alpha: alpha,
    focusName: alpha.focusName,
    score: 0,
    newAlphas: []
  }
```

**Purpose**: Create a score entry for every baseline alpha, starting at 0

---

### Step 6: Calculate Alpha Scores

For each alpha in the grouped structure, calculate its score using the following factors:

#### 6.1: Narrative Coverage
```
score = 0
maxscore = 0

nscore = 1
FOR each narrative in alpha.narratives:
  nscore += 1

if (nscore > 1) nscore = 2;
score = nscore;

maxscore = 2;
```

**Rationale**: Narratives provide context and explanation, indicating deeper understanding of the alpha

#### 6.2: State Checklist Coverage
```

statescore=0
statecount=0
FOR each state in alpha.states:
  statecount+=1
  IF state.checklist is not empty:
    statescore += 1


statescore = statestore / statecount
switch(statescore):
   case 0: break;
   case 1: break;
   case 2: break;
   case 3: break;
   default: statescore=4

score += statescore;
maxscore += 4;
```


**Rationale**: Checklists provide actionable criteria for state progression

#### 6.3: Work Product Contribution
```

wpscore=0

FOR each workProduct in workProducts:
  hasContribution = false
  
  FOR each levelOfDetail in workProduct.levelsOfDetail:
    FOR each contributesTo in levelOfDetail.contributesTo:
      IF contributesTo.alphaName == alpha.name:
        hasContribution = true
        BREAK
  
  IF hasContribution:
    wpscore += 1
    BREAK  // Only count once per work product


if (wpscore > 1) wpscore = 2;

score += wpscore;
maxscore += 2; 
```

**Rationale**: Work products are tangible artifacts that advance alpha states

#### 6.4: Activity Contribution
```

ascore=0;
FOR each activity in activities:
  hasContribution = false
  
  FOR each contributesTo in activity.contributesTo:
    IF contributesTo.alphaName == alpha.name:
      hasContribution = true
      BREAK
  
  IF hasContribution:
    ascore += 1
    BREAK  // Only count once per activity


if (ascore > 1) ascore=2;
score += ascore;
maxscore += 2;
```

**Rationale**: Activities are the work that advances alpha states

#### 6.5: Alpha Contribution
```

ascore=0;
FOR each oalpha in alphas:
  If oalpha.contributesTo == alpha.name
     ascore += 1

if (ascore > 1) ascore=2;
score += ascore;
maxscore += 2;
```

**Rationale**: Activities are the work that advances alpha states

#### 6.5: Normalise score
```

  float nscore = (float)score / (float)maxscore;
  score = (int)(3 * nscore + 0.5) #rounded normalised score converted to a 0 to 5 range

```

---

### Step 7: Aggregate Scores

```
FOR each alpha with calculated score:
  scores[alpha.name].score = score
```

**Purpose**: Save normalized score

**Effect**: Extension alphas contribute to the overall score of their root alpha, showing enrichment of baseline concepts

---

