# NekoLab

NekoLab now includes a deterministic expense-tracker MVP built on the existing Next.js, Prisma, and SQLite foundation.

The command flow for the MVP is:

`CLI input -> parse -> validate -> Prisma/SQLite -> output`

## Current Features

- Command-based expense logging
- Persistent person and expense records
- Per-person and overall totals
- Deterministic command processing
- Existing workflow foundation and dashboard

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Prisma 6
- SQLite

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
copy .env.example .env
```

3. Run Prisma migrations:

```bash
npx prisma migrate dev
```

4. Start the app:

```bash
npm run dev
```

5. Open the website at [http://localhost:3000](http://localhost:3000) and use the `Expenses` section for:
   - manual expense entry fields
   - submission feedback
   - the stored expense records table

6. Optional: run the same expense flow from the CLI:

```bash
npm run expense -- "expense add | person:Juliet | category:food | amount:500 | item:groceries | notes:weekly market run"
```

## Important Notes

- The local SQLite database lives at `prisma/dev.db` and is intentionally ignored by Git.
- Prisma migrations are the source of truth for schema changes.
- This project currently pins Prisma to v6 because the schema uses the classic SQLite `datasource.url` setup.
- The expense tracker is intentionally deterministic and does not use AI or natural language parsing.
- The website now exposes manual expense entry and a stored expense records table through the `Expenses` section.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run expense -- "expense total"
npx tsc --noEmit
npx prisma migrate dev
npx prisma studio
```

## System Model

- `Person` stores a unique person name.
- `Expense` stores an append-only expense record with category, amount, item, notes, and timestamp.
- `WorkflowRun` and `Log` remain in the repository as part of the existing foundation work.

## Supported Commands

```bash
npm run expense -- "expense add | person:Juliet | category:food | amount:500 | item:groceries | notes:weekly market run"
npm run expense -- "expense total | person:Juliet"
npm run expense -- "expense total"
```

## Next Areas

- Expense editing and correction flows
- Time-based filtering
- Income tracking
- Multi-domain expansion after the expense tracker is stable
