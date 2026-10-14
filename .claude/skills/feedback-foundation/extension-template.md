# Adding a project

A project's `plan-from-feedback` skill declares only what is specific to it. Everything
else is in `FEEDBACK-FOUNDATION.md` and must not be restated — a thin skill that grows
a copy of the workflow is how five projects become five workflows.

## 1. Add the routing entry

In `keleo-pgen-llm/utils/forge-issues.py`, add to `PROJECTS`:

```python
"my-project": {"forge": "github", "repo": "owner/my-project", "public": True},
```

For an internal GitLab target add `"host": "gitlab.cee.redhat.com"` and set
`"public": False`, which exempts it from sanitisation.

## 2. Write the skill

Create `<project>/.claude/skills/plan-from-feedback/SKILL.md`:

```markdown
---
name: plan-from-feedback
description: Triage and resolve <project> issues from its tracker — <one line on scope>
triggerPatterns:
  - "plan.*from.*feedback"
  - "triage.*issue"
  - "work.*backlog"
---

# Plan from Feedback — <project>

Read `.claude/skills/feedback-foundation/FEEDBACK-FOUNDATION.md` for the workflow,
routing, sanitisation, linking and closing rules. This file declares only what is
specific to <project>.

**Routing:** `<owner/repo>` — <public | internal>

## Change levels

| Level | Scope | When |
|---|---|---|
| **L1** | <the thing this project primarily produces> | <when> |
| **L2** | <its supporting code> | <when> |
| **L3** | <where it escalates, or its downstream obligation> | <when> |

## Locating the change

<How to get from an issue to the file. Name the utility or the map.>

## Validating the change

```bash
<the commands that prove the change is sound>
```

## Project notes

<Anything a resolver must know that is not obvious — build quirks, deployment steps,
what must not be touched.>
```

## 3. Vendor the foundation

```bash
python3 utils/vendor-skills.py --only feedback-foundation --target ../<project>
python3 utils/vendor-skills.py --check --target ../<project>
```

## 4. Write the contract

`contract.feature` alongside the skill, covering the scenarios in
`FEEDBACK-FOUNDATION.md` that the project exercises, plus anything specific to it.

## What belongs where

| Belongs in the foundation | Belongs in the skill |
|---|---|
| The five workflow steps | The L1/L2/L3 levels |
| Routing table and sanitisation | How to find the file to change |
| Commit linking, dedupe, closing | Validation commands |
| Status values, error handling | Build and deployment quirks |

If you find yourself writing a rule that would be true for another project, it belongs
in the foundation.
