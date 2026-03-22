# Expense Tracker

## Purpose

This document is the active reference for the evolving expense tracker inside NekoLab.

It is no longer just a handoff brief.

It should describe:

- what the expense tracker currently is
- what has already been accomplished
- what remains likely next
- what constraints still matter

## Current Alignment

The original plan started as a command-based backend-only MVP.

That is no longer fully aligned with the repository state.

What changed:

- the deterministic backend and CLI were built first
- the user then requested a browser-based expense workflow
- the browser workflow is now part of the active product surface

Current direction:

- deterministic expense tracking remains the core
- browser-based entry and browsing are now accepted scope
- AI, NLP, automation, dashboards, and multi-domain expansion are still out of scope

## Current Product Shape

The expense tracker currently includes:

- persistent expense storage through Prisma and SQLite
- a deterministic CLI command flow
- browser-based manual expense entry
- a stored-records table in the dashboard
- table sorting for supported fields
- multi-select filtering for person and category
- overview totals based on the currently filtered records

This is now a small expense-tracking system, not only a backend parser.

## Core Data Model

### Expense

- person: string
- category: string
- amount: number
- item: string
- notes: string
- timestamp: datetime

### Person

- name: string

## Current Entry Paths

### Browser entry

Primary browser fields:

- person
- category
- amount
- item
- notes

### CLI compatibility path

Supported command:

`expense add | person:<name> | category:<text> | amount:<number> | item:<text> | notes:<text>`

Also supported:

- `expense total | person:<name>`
- `expense total`

## System Rules That Still Apply

- deterministic behavior only
- persistent append-only expense records
- no overwriting existing expense rows
- required structured fields for each expense
- no AI or natural-language parsing
- no background jobs or automation
- no external API dependencies for the expense flow

## Accomplished

### Foundation alignment

- workflow lifecycle tests were added before expanding the product surface
- the historical Prisma migration path was hardened
- workflow definitions were added so the earlier system work was not left in a fragile state

### Expense tracker backend

- `Person` and `Expense` persistence were added through Prisma
- deterministic parsing, validation, storage, and totals were implemented
- the CLI entry point was added
- automated backend and route coverage was added

### Expense data refinement

- `category` and `notes` were made required
- migrations were adjusted to backfill safely for existing local rows

### Browser expense workflow

- expense entry moved from command-console UI to manual form fields
- the browser now uses a structured expense entry route
- the CLI remains available as a compatibility path

### Stored records UX

- a records table was added to the dashboard
- table formatting was cleaned up for readability
- filtered overview totals were added above the records table
- table sorting was added for supported columns
- person and category filters were added as multi-select popovers

## Known Constraints

### Intentional scope change

The earlier statement that this should not become a UI system is obsolete.

The user explicitly approved browser-based expense entry and browsing, so the plan should now reflect that accepted scope.

### Validation gap

The backend and routes have automated coverage, but the expense page interactions are still mostly protected by lint, typecheck, build, and manual verification.

## Probable Next Steps

Recommended next order:

1. add a browser-level test pass for expense page interactions, especially form submission, multi-select filters, and popover behavior
2. decide whether the legacy command route should remain publicly supported or be treated as internal compatibility only
3. extract the expense section from `app/page.tsx` into a focused component if the UI keeps growing
4. decide whether table filtering should later include reset affordances, result counts per selected filter, or saved views
5. update this document whenever the expense tracker meaningfully changes so it stays aligned with the repo

## Still Out Of Scope

Do not treat these as active work unless the user explicitly changes direction:

- AI or NLP input
- authentication
- multi-user support
- charts or analytics dashboards
- income tracking
- receipt or image processing
- other domains such as tasks, plans, or calendar

## Success Markers

The current expense tracker is in a good state if:

- expense entry remains fast and deterministic
- stored records stay accurate and append-only
- totals remain correct
- browser entry and table browsing feel stable
- documentation stays aligned with the actual implementation
