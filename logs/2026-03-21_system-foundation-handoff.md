# NekoLab System Foundation Handoff

## Summary

This log records the first stable NekoLab foundation after the initial build, cleanup, documentation pass, and first push to GitHub.

The repository is currently a private early-stage system project focused on establishing the base loop:

`UI -> API -> workflow service -> Prisma/SQLite -> API -> UI`

At this checkpoint, the project has:

- a minimal dashboard UI
- workflow execution endpoints
- persistent workflow runs and logs
- run history and log display in the dashboard
- repo hygiene and initial agent guidance

This is a good stopping point for the foundation phase.

## Repository State

- Repository name: `nekolab`
- GitHub remote: `origin`
- Default working branch: `main`
- Visibility: private
- Current pushed baseline commits:
  - `bf1725d` `feat: establish nekolab system foundation`
  - `e43e1e0` `chore: clean up repo hygiene for first push`
  - `424a658` `docs: document project setup and agent workflow`

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6
- SQLite

## What Was Built

### 1. Dashboard UI

The homepage was replaced with a minimal dark dashboard.

Current sections:

- `Workflows`
- `Logs`
- `Neko`

The page now shows:

- the latest workflow run
- recent run history
- selected run logs
- a workflow trigger button
- polling while the latest run is active

UI intent:

- keep the interface operational and minimal
- avoid decorative complexity
- expose real state instead of placeholder content where possible

## 2. Workflow Execution

Workflow execution now follows a basic run lifecycle.

Current status model:

- `pending`
- `running`
- `success`
- `failed`

Current behavior:

- the UI triggers `POST /api/workflow/run`
- the API creates a workflow run
- the request returns quickly with the queued run
- processing continues after the response
- logs are written as the run progresses
- the dashboard polls and reflects updated state

## 3. Persistence

The system no longer uses in-memory logs.

Persistence is now handled through Prisma and SQLite.

Primary models:

### `WorkflowRun`

Stores:

- identity
- name
- status
- created time
- updated time
- start time
- finish time
- error state

### `Log`

Stores:

- the related workflow run id
- log level
- message
- timestamp

Logs belong to workflow runs. Runs are the source of truth for execution state.

## 4. API Surface

Current routes:

- `GET /api/workflow/run`
  - returns the latest workflow run with logs
- `POST /api/workflow/run`
  - creates and queues a new workflow run
- `GET /api/workflow/runs`
  - returns recent workflow run history
- `GET /api/workflow/runs/[id]`
  - returns a single workflow run with logs
- `GET /api/logs`
  - returns logs, with support for run-specific reading

The API layer is intentionally thin. Workflow logic lives in the service layer.

## 5. Service Layer

Workflow behavior is centralized in `lib/workflows.ts`.

Current responsibilities:

- create workflow runs
- append workflow logs
- fetch latest run
- fetch run history
- fetch one run with logs
- process a run lifecycle from queued to completion

This keeps route handlers from becoming the business-logic layer.

## 6. Repo And Documentation Cleanup

The repo was cleaned up before the first push.

Changes made:

- replaced the default README with NekoLab-specific setup notes
- added `session-guide.md` as the repo guide for AI coding agents
- added `.env.example`
- updated `.gitignore`
- ignored local SQLite database files
- removed network-dependent font fetching to make builds more reliable

## Important Files

Core app files:

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`

API files:

- `app/api/workflow/run/route.ts`
- `app/api/workflow/runs/route.ts`
- `app/api/workflow/runs/[id]/route.ts`
- `app/api/logs/route.ts`

Logic and storage files:

- `lib/prisma.ts`
- `lib/workflows.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`

Project guidance:

- `README.md`
- `session-guide.md`
- `AGENTS.md`

## Validation Performed

The following checks were run successfully on the cleaned baseline:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Additional notes:

- Prisma migrations were applied successfully
- the local SQLite database is intentionally not tracked in Git

## Decisions Made

### 1. Root `app/` Instead Of `src/app/`

The repository uses the root-level Next.js App Router structure.

This matters because some generated or example instructions assumed `src/app`, which would have been wrong for this repo.

### 2. Prisma 6 Instead Of Prisma 7

Prisma was pinned to version 6 because the requested SQLite schema setup used the classic:

`datasource db { url = "file:./dev.db" }`

Prisma 7 changed that behavior and would have created unnecessary friction during the foundation phase.

### 3. Minimal UI, Not Over-Abstracted UI

The dashboard was kept in a single page and not split into unnecessary components.

This kept the system simple while the data flow and storage model were still being established.

### 4. Runs Are The Source Of Truth

The system treats workflow runs as the primary execution record.

Logs support observability, but do not replace the run record.

That is the correct direction for future retries, filtering, background workers, and failure handling.

## Known Issues And Risks

These are the main issues identified during the detailed repo scan.

### 1. Migration Robustness

The latest Prisma migration is not safe for a non-empty database.

Risk:

- a required `updatedAt` column was introduced without a safe backfill path for existing rows

Impact:

- this is acceptable for the current private early-stage repo state
- it should be fixed before the system is treated as reusable by other contributors or reused with existing data

### 2. Non-Atomic Workflow Creation

Workflow creation is not fully atomic.

Current risk:

- a workflow run can be created before the initial queued log is written
- if the log write fails, the API may error while a partially-created run remains in storage

Impact:

- this can leave orphaned `pending` runs
- retries become harder to reason about

### 3. No Automated Lifecycle Tests

There are no tests protecting the workflow lifecycle yet.

Current state:

- lint, typecheck, and build pass
- behavior is still validated mostly by runtime checks and manual observation

Impact:

- regressions in status transitions, API responses, or polling behavior could slip through

## Where We Left Off

The project is at the end of the first foundation pass.

What is true right now:

- the repo is pushed
- the app builds
- the dashboard works
- workflow runs persist
- logs persist
- the system loop is real, not simulated with in-memory state
- the repo is still private and used only by the owner

What is intentionally unfinished:

- migration hardening
- transactional workflow creation
- automated tests
- true background job infrastructure
- workflow definitions beyond the default workflow
- authentication
- Neko AI features

This is an acceptable stopping point because the base architecture now exists and the remaining work is mostly hardening and extension work.

## What Comes Next

The next pass should focus on fundamentals before adding more features.

### Recommended next order

1. Fix the unsafe Prisma migration path for non-empty databases
2. Make workflow creation atomic
3. Add minimum lifecycle tests
4. Improve failure-path handling and retry readiness
5. Add real workflow definitions instead of a single default workflow

### Why this order

This protects the base system before more surface area is added.

If new features are added before these fixes, the repo will accumulate avoidable technical debt around the most important system boundary: execution state.

## Suggested Next Session Starting Point

Start with a hardening-only pass.

Recommended session goal:

`fix workflow persistence and execution fundamentals`

Suggested focus:

- make `createWorkflowRun` transactional
- repair or replace the unsafe migration path
- add tests for:
  - run creation
  - state transitions
  - success completion
  - failure completion
  - API shape for latest run and run history

Only after that should the project move into:

- workflow definitions
- background workers
- auth
- Neko integration

## Closing Note

This checkpoint establishes the real foundation of NekoLab.

The project now has a functioning system loop, persistence, operational visibility, and a clean enough repository baseline to keep building without losing structure.
