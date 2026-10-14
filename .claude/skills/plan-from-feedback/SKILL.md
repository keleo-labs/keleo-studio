---
name: plan-from-feedback
description: Triage and resolve keleo-studio issues from its GitHub tracker — the Next.js web application, its API routes and its core library
triggerPatterns:
  - "plan.*feedback"
  - "triage.*issues"
  - "work.*backlog"
  - "process.*issues"
---

# Plan from Feedback — keleo-studio

Read `.claude/skills/feedback-foundation/FEEDBACK-FOUNDATION.md` for the workflow,
routing, sanitisation, commit linking and closing rules. This file declares only what
is specific to keleo-studio.

**Routing:** `keleo-labs/keleo-studio` — **public**, so anything filed from here to
another project is sanitised.

This project does not read the feedback register. Its queue is its own tracker.

Read `SOUL.md` before changing anything. It states the engineering philosophy this
codebase is held to, and a change that passes lint while violating it will be rejected.

---

## Change levels

| Level | Scope | When |
|---|---|---|
| **L1** | `web/src/app/`, `web/src/components/` | The issue is about what the user sees or does — rendering, navigation, layout, an editor behaving wrongly |
| **L2** | `web/src/lib/` | The issue is in logic rather than presentation — merge algorithms, library resolution, storage, validation, report generation |
| **L3** | Escalate to keleo-language | The issue is a gap in the Practice Language itself. **File it there; do not edit the schema from here.** |

Most reported issues arrive as L1 because that is where they are seen. Check before
fixing: a wrong value rendered correctly is an L2 defect wearing an L1 costume, and
patching the component hides it rather than fixing it.

`web/public/language.schema.json` is a copy of the schema, not its source. Correcting
it here without the upstream fix means the two disagree at the next sync.

---

## Locating the change

| Issue mentions | Look in |
|---|---|
| Library browsing | `web/src/app/library/` |
| Method composition | `web/src/app/method-builder/`, `web/src/lib/methodMerge/` |
| Practice authoring, field editors | `web/src/app/practice-author/`, `web/src/components/editors/` |
| Pattern or kanban views | `web/src/app/flow-visualizer/` |
| Topology diagrams | `web/src/app/topology-viewer/` |
| PDF or report output | `web/src/lib/practiceReport/`, `web/src/app/api/pdf/` |
| Saving, loading, storage backends | `web/src/lib/storage/` |
| Document CRUD | `web/src/app/api/documents/` |

The register records a Page and a Navigator Mode for issues raised from the application.
Where an issue carries them, they name the route directly.

---

## Validating the change

```bash
cd web
npm run lint
npm run build
```

The build is the real gate — TypeScript is in strict mode, so a type error is a failure
rather than a warning. Lint alone will not catch it.

For anything touching rendering, run `npm run dev` and look at the page. A component
change that compiles is not evidence the defect is fixed, and this project has no
component test suite to stand in for looking.

---

## Project notes

- Business logic in `web/src/lib/` is deliberately storage-agnostic. A fix that reaches
  into a storage backend from library or merge code breaks that separation even when it
  works.
- API routes are thin controllers. Logic belongs in `web/src/lib/`, not in the route.
- Practice content lives in `practices/adoption-library.json`. An issue about a
  *practice* rather than the application belongs to keleo-pgen-llm, which generates
  them — file it there.
