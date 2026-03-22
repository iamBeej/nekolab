# NekoLab Workflow Guide

This file is for AI coding agents working in the NekoLab repository.

## Purpose

NekoLab is a system-foundation project.

Core loop:

`UI -> API -> workflow service -> Prisma/SQLite -> API -> UI`

The codebase should stay minimal, explicit, and easy to extend.

## Project Shape

- Next.js App Router project
- TypeScript
- Tailwind CSS
- Prisma 6
- SQLite for local persistence

Important:

- This repo uses `app/` and `lib/` at the root
- Do not assume `src/` exists
- Prisma schema is in `prisma/schema.prisma`
- Local SQLite database is `prisma/dev.db`
- Migrations are the source of truth, not the database file

## Current System Model

### Workflow runs

`WorkflowRun` is the primary execution entity.

Expected lifecycle:

- `pending`
- `running`
- `success`
- `failed`

### Logs

Logs belong to a specific workflow run.

Use logs for observable state changes such as:

- queued
- started
- completed
- failed

Do not treat logs as the primary source of workflow state. The run record is the source of truth.

## Architecture Rules

### UI

- Main dashboard is `app/page.tsx`
- Keep the UI minimal and operational, not decorative
- Show real system state, not placeholder text when data exists
- Prefer polling for active runs over fake optimistic state

### API

- Keep route handlers thin
- Route handlers should validate input, call service-layer functions, and return JSON
- Business logic belongs in `lib/`, not inside route handlers

### Logic layer

- Put workflow execution logic in `lib/workflows.ts` or nearby focused modules
- Prefer explicit small functions over large route handlers
- Keep read-model functions separate from mutation/execution functions when possible

### Storage

- Use Prisma for persistence
- If the schema changes, update `prisma/schema.prisma` and create a migration
- Do not commit `prisma/dev.db`

## Status And Timestamp Rules

- Use typed statuses and levels from Prisma enums where available
- Prefer `DateTime` fields in Prisma over string timestamps for stored records
- Convert timestamps for display in the UI, not before persistence

## Workflow Execution Rules

- Creating a workflow run should be fast
- Long-running work should not block the initial API response
- Use Next.js-supported server patterns already used in this repo
- A queued run should become `running`, then finish as `success` or `failed`
- Failures should update both the run record and logs

## File Conventions

Use these as the default locations:

- Dashboard page: `app/page.tsx`
- Workflow trigger/latest run API: `app/api/workflow/run/route.ts`
- Workflow history API: `app/api/workflow/runs/route.ts`
- Single run API: `app/api/workflow/runs/[id]/route.ts`
- Logs API: `app/api/logs/route.ts`
- Prisma client: `lib/prisma.ts`
- Workflow service: `lib/workflows.ts`

## Change Discipline

- Keep solutions simple
- Do not add external packages unless they are necessary
- Do not add database abstractions on top of Prisma without a strong reason
- Avoid premature component extraction for very small UI sections
- Avoid introducing multiple patterns for the same concern

## Session Alignment Check

Before starting substantial new work, read the most recent project logs in `logs/`.

Use those logs to check:

- what the previous session said should happen next
- whether the current task is still aligned with that plan
- whether the work has started to drift from the intended priority order

If the work is diverging from the logged plan, call that out explicitly before continuing.

## Validation Checklist

After meaningful changes, validate with:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

If Prisma schema changes:

```bash
npx prisma migrate dev --name <migration-name>
```

## Repo Hygiene

- `.env` stays local
- `.env.example` should reflect required variables
- `README.md` should stay accurate
- project handoff logs belong in `logs/`
- Do not commit generated local state that should remain ignored

## Project Logs

Use `logs/` for detailed project logs and handoff notes.

### Session-end logging rule

Create a session log when the user signals that the current work session is ending.

Examples of valid signals:

- the user says to stop for now
- the user asks for a handoff
- the user indicates the session is done
- the user asks to continue later

Do not create a session log just because work paused briefly during the same session.

The trigger comes from the user, not from the agent making its own assumption that the session has ended.

Log rules:

- use one Markdown file per meaningful session or milestone
- file name format: `yyyy-mm-dd_brief-summary.md`
- keep the summary brief, lowercase, and hyphenated
- the internal structure can be flexible based on the work completed
- include both:
  - where work stopped
  - what should happen next

Good examples:

- `2026-03-21_system-foundation-handoff.md`
- `2026-03-22_workflow-hardening-pass.md`

Use logs to capture:

- major changes made
- validation performed
- important decisions
- known issues
- next recommended steps

## Commit Convention

Use a simple conventional-commit style.

Required format:

```text
<type>: <summary>

Summary:
...

Details:
...

Impact:
...
```

Examples:

- `feat: add workflow run history api`
- `fix: handle failed workflow completion`
- `refactor: move workflow logic into service layer`
- `docs: update setup instructions`
- `chore: clean up repo hygiene`

Allowed commit types:

- `feat` for new user-facing or system-facing capability
- `fix` for bug fixes or incorrect behavior
- `refactor` for structural code changes without intended behavior change
- `docs` for documentation-only changes
- `test` for test additions or test-only updates
- `chore` for maintenance, cleanup, config, or dependency work

### Resolved issue checkpoint rule

If a discrete issue has been resolved, the agent should propose a commit for that completed unit of work.

Treat it as a checkpoint commit, but use a valid commit type from the allowed list above.

Do not use `checkpoint` as the commit type.

Use the normal conventional title format, and note in the commit body that the change represents a checkpoint after resolving the issue.

Commit summary rules:

- Use lowercase
- Use imperative phrasing
- Keep it short and specific
- Do not end with a period
- Describe the primary change, not every detail
- The summary must briefly state what the commit accomplishes

Commit scope rules:

- A commit must focus on a single purpose
- Do not mix unrelated refactors, feature work, and repo cleanup in one commit
- If multiple changes are needed, split them by purpose
- The commit title should reflect the one reason the commit exists

Good summaries:

- `feat: add workflow status polling`
- `fix: return 404 for missing workflow runs`
- `chore: ignore local sqlite database`

Avoid:

- `update stuff`
- `misc fixes`
- `final changes`
- `feat: Added New Workflow Feature.`

If a change spans multiple concerns, prefer the dominant outcome:

- behavior change -> `feat` or `fix`
- structural cleanup -> `refactor`
- repo/setup cleanup -> `chore`

For the first baseline commit of a new system foundation, prefer:

- `feat: establish nekolab system foundation`

Commit body is required.

The body should make the commit self-explanatory without requiring separate developer logs.

Body rules:

- Do not leave the body empty
- Explain what changed and why it changed
- Keep the body detailed enough that someone reading Git history can understand the decision later
- Prefer concise detail over verbose storytelling
- If there are meaningful tradeoffs, constraints, or follow-up implications, include them

Recommended body shape:

```text
<type>: <summary>

Summary:
...

Details:
- ...
- ...

Impact:
...
```

Good body sections:

- `Summary`
- `Details`
- `Impact`
- `follow-ups`
- `scope`

The body should already carry the important implementation context.

Do not rely on:

- external developer logs
- vague PR descriptions
- memory outside the commit itself

When proposing a commit, include:

1. Commit title in the required format
2. A complete commit body
3. Keep the proposal aligned to one purpose only

Do not propose vague commit messages.

## Current Priority Order

When making changes, prefer this order:

1. Correctness
2. Clear system boundaries
3. Operational visibility
4. Simplicity
5. UI polish

## When Extending The System

Good next-step areas:

- workflow definitions
- richer run history
- retry/failure handling
- background workers
- auth
- Neko AI integration

Do not skip the system foundation to jump straight to AI features.
