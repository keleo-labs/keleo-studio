# Writing the issue

Read this with `sanitisation.md` before drafting for any tracker. Sanitisation decides
what may be said; this decides how well it is said. Both apply — an issue can be
perfectly safe and still useless.

Load `.claude/skills/writing-style/SKILL.md` and follow it. A published issue is prose
for a human audience, so the house style applies to it exactly as it does to a report.

## Rewrite, never transform

Register descriptions are written for an internal reader who already has the context,
and some were generated rather than written. They arrive long, hedged, and full of AI
tells — scene-setting openers, relentless triads, "it's not just X, it's Y", section
closers that restate the section.

Redacting such a description word by word produces something worse than the original:
the tells survive, the specifics vanish, and the reader gets `[…]` where the meaning
was. **Read the row, understand the defect, then write the issue from scratch.**

## What an issue needs

Three things, in this order.

**What is wrong.** The observable behaviour, stated as a fact. Not "there appears to be
a potential inconsistency" — say what happens.

**Why it matters.** The consequence for someone. A defect with no consequence is a note,
not an issue.

**What is expected.** The condition under which it would be closed. Without this, nobody
can tell when they are finished.

Reproduction steps go last, when they can be given without internal detail. A command
anyone can run is worth more than a paragraph describing one.

## Titles

Sentence case. Specific enough to be recognised in a list of forty, short enough to read
in a glance. The title states the defect, not the area it lives in.

| Weak | Better |
|---|---|
| Issue with forecast weights | Forecast weight curve decreases toward the recognised point |
| Documentation improvements needed | Validation instructions recommend a command that fails under PEP 668 |
| Bug in the sanitiser | Denylist harvest misses terms reported as missing from the corpus |

## Register

Plain English. Short paragraphs on a single point. Prose rather than bullets, except
where there are genuinely three or more parallel items or a sequence of steps.

Never claim something is "secure" — say "security focused". Never use "ensures". No
hyperbole, no marketing language, no hedged non-claims like "can help to potentially
improve".

Write as a person to a person. "You" for the reader. Avoid "we" unless you can name who
"we" is, which in an issue you usually cannot.

## What to cut

- Openers that set the scene or restate the title
- Closing paragraphs that summarise what was just said
- Three adjectives where one is true
- Anything about where you were or what you were doing when you found it — that belongs
  to the register row, and is usually unpublishable anyway

## A worked example

The register row, as filed:

> Pattern across the practice: strong on what to measure and why, absent on the
> identifiers an operator needs. The practice establishes that inference latency,
> throughput and key-value cache occupancy are the signals that matter, and the
> attribution constraint around time-slicing is excellent. What it does not carry is a
> single Prometheus metric key. Observed while writing a reference architecture sourced
> only from these practices…

The issue:

> **Title:** Observability guidance names signals but no metric keys
>
> Register row: 46
>
> The guidance says which signals matter and why, but names no metric key for any of
> them. A reader can understand what to watch and still have nothing to paste into a
> dashboard or an alert rule.
>
> Expected: each named signal carries the metric key that exposes it, and an indicative
> threshold where one can be stated.

Shorter, plainer, and it survives sanitisation — the practice name, the product names
and the circumstance of discovery are all in the row, where they belong.
