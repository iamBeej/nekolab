# NekoLab

NekoLab is a minimal system foundation built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and SQLite.

The current system loop is:

`UI -> API -> workflow service -> Prisma/SQLite -> API -> UI`

## Current Features

- Dark dashboard UI
- Workflow run queueing
- Async workflow lifecycle
- Persistent run history
- Persistent logs tied to workflow runs

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

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Important Notes

- The local SQLite database lives at `prisma/dev.db` and is intentionally ignored by Git.
- Prisma migrations are the source of truth for schema changes.
- This project currently pins Prisma to v6 because the schema uses the classic SQLite `datasource.url` setup.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npx prisma migrate dev
npx prisma studio
```

## System Model

- `WorkflowRun` tracks queued, running, successful, and failed executions.
- `Log` entries belong to a specific workflow run.
- The dashboard shows the latest run, recent history, and logs for the selected run.

## Next Areas

- Background workers beyond in-process execution
- Workflow definitions instead of a single default workflow
- Authentication
- Neko AI workflow generation
