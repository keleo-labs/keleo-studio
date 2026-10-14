# Feedback Foundation

> **Vendored copy.** This tree is distributed with `keleo-pgen-llm` so the
> capability works from a clone without a user-level install. It tracks the
> global skill at `~/.claude/skills/feedback-foundation/` version by version; the only
> intended difference is that paths are repo-relative rather than
> `~/.claude/skills/…`. If the two diverge otherwise, the global copy is
> upstream. Re-copy with `python3 utils/vendor-skills.py`.

**Version:** 1.0.0

Common workflow, rules, and conventions shared by every project's
`plan-from-feedback` skill. **Load lazily** — read only the section you need at the
step that needs it.

A project's own `SKILL.md` declares just four things: its L1/L2/L3 change levels, how
to locate the thing to change, how to validate a change, and its routing entry. Every
other rule is here, so five projects cannot drift into five workflows.

---

## The model

Two systems, each with one job.

**The register** — a Google Sheet — is intake. It holds the full, unredacted report:
who saw it, which customer engagement prompted it, which document and element. That
detail is what makes triage possible and most of it cannot be published.

**The tracker** — GitHub or GitLab issues — is the resolution queue. Issues are worked,
linked to commits, and closed there.

Register rows are published to trackers as sanitised issues carrying a row pointer.
Issues filed directly on a tracker by anyone else are first-class: they are worked the
same way, they simply have no row to write back to.

```
report → register row (full detail, internal)
            │
            │  publish: sanitise, route, dedupe
            ▼
         tracker issue (public-safe, carries "Register row: N")
            │
            │  triage → change → commit "Refs <repo>#N"
            ▼
         closed issue  +  register row Q–V updated
```

**Publishing is centralised.** Only keleo-pgen-llm reads the register — it alone has
the `gws` dependency and the credentials, and it is the single place unredacted content
is handled. Every other project only ever reads its own tracker.

---

## Routing (Step 0)

`utils/forge-issues.py --routing` is the authority. Do not hard-code repositories.

| Project | Tracker | Public? |
|---|---|---|
| keleo-pgen-llm | `keleo-labs/keleo-pgen-llm` | yes |
| keleo-language | `keleo-labs/keleo-language` | yes |
| keleo-studio | `keleo-labs/keleo-studio` | yes |
| keleo-studio-gas | `planify/keleo-studio-gas` (internal GitLab) | no |
| keleo-userskillz | `planify/planify-cursor` (internal GitLab) | no |

`public` drives sanitisation, not the forge. An internal tracker takes the full detail —
it is already behind the firewall, and stripping it there loses information for nothing.

Practice and method content issues route to keleo-pgen-llm under `component:content`.

---

## Sanitisation and drafting (Step 1)

Read `sanitisation.md` before drafting anything for a public tracker, and `drafting.md`
before drafting for any tracker. Sanitisation decides what may be said; drafting decides
how well it is said. An issue can be perfectly safe and still useless.

The short version: a published issue is indexed and stays reachable by SHA after
deletion, so this is a one-way door. Draft the issue yourself, then let
`utils/issue-sanitiser.py` verify it. The gate is a floor beneath your judgement, not a
replacement for it — it catches what it can enumerate, and cannot catch a term that is
sensitive for reasons only you know.

`utils/forge-issues.py --create` refuses a public target whose body fails the gate, so
the check cannot be skipped by going round it.

---

## Publishing a row (Step 1, keleo-pgen-llm only)

For each register row with Status `New` and no Issue URL:

1. **Determine the owning project** from the row's content, not its Document Name. A row
   about schema semantics belongs to keleo-language even when it was observed in a
   practice.
2. **Draft a title and body** — read `drafting.md`. Write the issue from the defect, do
   not redact the row's description into one. Some rows were generated rather than
   written and arrive full of AI tells; transforming them word by word keeps the tells
   and loses the meaning. The body opens with `Register row: N`, then says what is
   wrong, why it matters, and what is expected.
3. **Check it** — `issue-sanitiser.py --check <draft>`.
4. **Search for a near-duplicate** — `forge-issues.py --search "<title>"`. Searches open
   *and* closed, because a defect filed again after closure belongs on the original
   thread.
5. **Comment or create.** On a match, add a comment naming the new register row rather
   than filing again. Otherwise create.
6. **Write back** Issue URL and Issue State to columns U and V.

Rows that must not be published at all — because no useful statement survives
sanitisation — get Issue State `Not Published` and a reason in Resolution Summary.
Record the decision; do not leave the row looking unprocessed.

**Human approval is mandatory before the first publication run**, and any run that would
create more than five issues shows `--dry-run` output first.

---

## Working the queue (Steps 2–3)

The queue is `forge-issues.py --project <name> --list`. Not the register.

For a register-linked issue, read the row it names for the detail the issue cannot
carry. For a natively-filed issue, the issue is all there is.

**Triage** assigns a level. The levels are the project's own — see its `SKILL.md` — but
the rule across all of them is the same: fix at the lowest level that addresses the
cause, and do the minimum set.

**An issue owned by another project is filed there and left.** File it with
`forge-issues.py --create --project <other>`, link it from the issue you were working,
and move on. Do not edit another project's code from here. The cross-project report is
the deliverable, not the fix.

---

## Linking changes (Step 4)

Every change traces to its issue.

- Commit messages carry `Refs keleo-labs/<repo>#N`, or `Closes #N` where the commit
  completes the issue and the commit lands in that same repository.
- A cross-repository reference always uses the full `owner/repo#N` form, because a bare
  `#N` resolves against the wrong tracker.
- Where several commits serve one issue, each carries `Refs`; only the last carries
  `Closes`.

Follow the repository's own git rules for branching and scanning. They are not restated
here.

---

## Closing (Step 5)

Both systems are updated, in this order:

1. **Comment the resolution on the issue** — what changed, where, and how it was
   verified. This is the public record and it must stand on its own.
2. **Close the issue.**
3. **Update the register row** where one exists: Status, Q–T as the project defines
   them, and Issue State `Closed` in V.

A resolution written to one system and not the other is how the two drift. If the
register write fails, say so rather than leaving the issue closed and the row stale.

---

## Status values

Register Status (column P): `New`, `Planned`, `In Progress`, `Resolved`, `Closed`,
`Declined`. Issue State (column V): `Open`, `Closed`, `Not Published`.

They answer different questions — Status is the work, Issue State is the publication.
A row can be `Resolved` with Issue State `Not Published` if it was fixed without ever
being published.

---

## Declining and omitting

**Decline** an issue that is intentional behaviour or would be harmful to change: close
it with a rationale, and set the register Status to `Declined`.

**Omit** nothing now that routing exists. The old rule — leave studio UI issues
untouched for someone else to find — existed because there was nowhere to send them.
There is now: file them on `keleo-studio` and leave them unresolved.

---

## Defects you find along the way

`SKILL-STANDARD.md` §13 applies: fix what you can in the run, file what you leave
standing. With trackers in place, file it as an issue on the owning project rather than
only as a register row, so the project that owns it can see it.

---

## Error handling

| Condition | Response |
|---|---|
| Forge not authenticated | `forge-issues.py` reports the exact `auth login` command. Stop; do not fall back to filing only in the register. |
| Sanitiser blocks a draft | Rewrite the draft. Never bypass the gate, and never weaken the denylist to make one issue pass. |
| Near-duplicate found | Comment on the match. Filing anyway needs a stated reason. |
| Register write fails | Report the intended values so they can be applied by hand. The issue is already public; the row is the recoverable half. |
| Issue references a row that no longer exists | Work the issue on its own terms and note the broken reference in a comment. |
