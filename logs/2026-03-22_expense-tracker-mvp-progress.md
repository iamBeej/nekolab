# Expense Tracker MVP Progress

## Summary

This log records the work completed after the workflow hardening pass and the shift into the expense-tracker MVP.

The original logged priority after hardening was:

1. lifecycle tests
2. migration safety
3. workflow definitions

Those items were completed first.

After that, work intentionally diverged from the workflow-only roadmap because the user introduced a new handoff plan for a deterministic expense tracker and then requested a browser-based UI on top of it.

## Alignment Check

This session did not stay strictly inside the workflow-only next-step list from the earlier logs.

That divergence was intentional and user-directed.

What happened in order:

1. workflow fundamentals were hardened further
2. the expense-tracker MVP handoff was added
3. implementation moved into expense tracking and browser-based UX

The key point is that the system did not jump into expense work before the outstanding workflow foundation issues were addressed.

## Foundation Work Completed

### Workflow lifecycle coverage

- added automated lifecycle coverage for workflow creation, success flow, duplicate processing protection, failure handling, latest-run API, run history API, invalid limit handling, and single-run lookup behavior
- introduced Vitest setup and an isolated test database path so the suite does not use the local development database

Impact:

- the workflow execution boundary now has regression coverage instead of relying only on runtime observation

### Historical Prisma migration hardening

- repaired the unsafe historical Prisma migration path so legacy log rows and workflow runs can upgrade safely on non-empty databases
- added migration validation coverage that simulates upgrading an older populated SQLite database

Impact:

- the repo history is safer to reuse locally without depending on an empty database

### Workflow definitions

- added explicit workflow definitions instead of relying only on a single hardcoded default workflow
- updated the API and dashboard so workflows can be listed, selected, and queued by definition id

Impact:

- the workflow system moved beyond the first hardcoded execution path while keeping the same architectural boundary

## Expense Tracker MVP Work Completed

### Planning and documentation

- added a `plans/` directory for incoming coding-agent handoffs
- added the first expense-tracker MVP plan, which has since been updated into the living document at `plans/expense-tracker.md`

### Core expense-tracker implementation

- added persistent `Person` and `Expense` models through Prisma migrations
- implemented deterministic expense command parsing and storage
- added a single CLI entry point for expense commands
- added tests for expense command behavior and route behavior

Impact:

- the repo now contains a working deterministic expense-tracker backend with persistent storage and automated coverage

### Data model refinement

- added required `category` and `notes` fields to expense records
- hardened the follow-up migrations so existing local rows can be upgraded safely with backfilled values

Impact:

- stored expenses are more specific without introducing a wider analytics surface

### Browser-based expense workflow

- first exposed expense commands through a website console
- then replaced that console with manual structured form fields for:
  - person
  - category
  - amount
  - item
  - notes
- kept the CLI and deterministic backend behavior intact

Impact:

- expense entry is now usable from the website without relying on command strings

### Expense records visibility

- added a Prisma-backed records route for expense history
- added a stored-records table to the dashboard
- added filtered overview totals above the records table
- populated the local untracked development database with sample rows for `Beej`, `Myra`, `Yolac`, and the earlier `Juliet` test row

Important:

- those sample records live only in local `prisma/dev.db`, which remains untracked

### Expense table interaction pass

- added sortable table headers for supported fields
- added person and category filtering
- converted those filters into multi-select header popovers
- changed the popovers into fixed overlays so they can overlap the table without clipping
- converted the filter options to a checklist-style selection model
- contained filter-menu scrolling so the interaction stays inside the popover
- widened the desktop layout and refined the table presentation for readability

Impact:

- the expense table is now more usable for browsing and slicing stored records in the browser

## Other Changes

### Assistant naming

- renamed the active assistant-facing identity from `Neko` to `Winter`
- left the product name `NekoLab` intact

## Validation

Across the work in this pass, the following checks were run successfully after meaningful changes:

- `npm run test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Additional notes:

- Prisma client generation and migration commands were run where schema changes required them
- a temporary Windows Prisma client file lock was resolved by stopping active `node.exe` processes before regeneration

## Repository State

Notable commits included in this pass:

- `c805190` `test: add workflow lifecycle coverage`
- `1f33700` `fix: harden legacy prisma migration path`
- `8652baf` `feat: add selectable workflow definitions`
- `c637bcc` `feat: add expense tracker mvp command flow`
- `a56d5ea` `feat: add expense categories and notes`
- `3badd20` `feat: replace expense console with manual entry form`
- `1e73268` `refactor: improve expense table filter interactions`

## Where Work Stopped

The repository now has:

- a hardened workflow foundation
- workflow lifecycle tests
- a safer historical migration chain
- explicit workflow definitions
- a persistent expense-tracker MVP
- browser-based manual expense entry
- a visible expense records table with filtering and sorting

Current local status:

- `main` is pushed through `1e73268`
- the worktree is clean except for the unrelated untracked `CLAUDE.md`

## Known Gaps

### Plan drift from the original MVP handoff

The original expense-tracker handoff explicitly said this should not become a UI system.

That is no longer true.

The repository now includes a browser-based expense entry and table workflow because the user requested that surface directly.

This should be treated as an intentional scope change, not an accidental one.

### No dedicated page-level UI tests for the expense dashboard

The backend and route behavior have automated coverage, but the browser interactions around filter popovers and table behavior are still validated mainly through manual checks plus build and type safety.

## What Should Happen Next

Immediate next recommendations for the next session:

### 1. Stabilize the current system

- ensure expense entries remain accurate and consistent
- verify that totals always match stored records
- fix any remaining UI inconsistencies around filters and table behavior

### 2. Define a small set of core metrics

Limit the first metrics pass to decision-relevant outputs only:

- total expenses for the current week
- total expenses for the current month
- expenses per person
- current week versus previous week comparison
- recent expenses for the last 5 to 10 entries

### 3. Add simple insight outputs without introducing a new dashboard

Prefer text outputs over new chart or dashboard work.

Examples:

- `This week: ₱X (↑ ₱Y vs last week)`
- `Top spending: <person/category>`
- `Recent activity: ₱X across N entries`

### 4. Validate daily usage

The next pass should verify that the system remains practical in everyday use:

- expense logging in less than 10 seconds
- easy review of totals and recent activity
- no confusion when reading data

### 5. Keep these deferred

Do not implement yet:

- charts or dashboards
- AI or Winter-related features
- external integrations
- multi-domain expansion such as tasks, plans, or income
- automation

### Guiding principle

Focus on:

- accuracy
- simplicity
- daily usability

Do not expand the feature surface until:

- data is reliable
- metrics are useful
- the system is being used consistently

## Closing Note

The project is no longer just a workflow-foundation sandbox.

It now has a real secondary product surface: a deterministic, persistent expense tracker with both CLI and browser entry paths.

That shift is workable because the workflow boundary was hardened first, but future logs should acknowledge that the repository now spans both workflow infrastructure and expense tracking.
