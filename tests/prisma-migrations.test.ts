import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, test } from "vitest";

const migrationDatabasePath = path.join(
  process.cwd(),
  "prisma",
  "migration-vitest.db",
);
const migrationDirectory = path.join(process.cwd(), "prisma", "migrations");
const migrationFilePaths = [
  path.join(migrationDirectory, "20260321151855_init", "migration.sql"),
  path.join(migrationDirectory, "20260321152305_workflow_runs", "migration.sql"),
  path.join(
    migrationDirectory,
    "20260321152848_system_fundamentals",
    "migration.sql",
  ),
];

function removeMigrationTestDatabase() {
  for (const suffix of ["", "-shm", "-wal"]) {
    const filePath = `${migrationDatabasePath}${suffix}`;

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
    }
  }
}

async function executeSqlFile(prisma: PrismaClient, filePath: string) {
  const sql = fs.readFileSync(filePath, "utf8");

  for (const statement of sql
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await prisma.$executeRawUnsafe(`${statement};`);
  }
}

describe.sequential("prisma migration history", () => {
  afterEach(() => {
    removeMigrationTestDatabase();
  });

  test("upgrades a legacy log database with existing rows", async () => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${migrationDatabasePath}`,
        },
      },
    });

    await prisma.$connect();

    try {
      await executeSqlFile(prisma, migrationFilePaths[0]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "Log" ("status", "message", "timestamp")
        VALUES
          ('info', 'Legacy workflow queued', '2026-03-21T10:00:00.000Z'),
          ('error', 'Legacy workflow failed', '2026-03-21T10:05:00.000Z');
      `);

      await executeSqlFile(prisma, migrationFilePaths[1]);
      await executeSqlFile(prisma, migrationFilePaths[2]);

      const runs = await prisma.workflowRun.findMany({
        include: {
          logs: {
            orderBy: {
              id: "asc",
            },
          },
        },
      });

      expect(runs).toHaveLength(1);
      expect(runs[0]?.name).toBe("Legacy log import");
      expect(runs[0]?.status).toBe("failed");
      expect(runs[0]?.createdAt.toISOString()).toBe("2026-03-21T10:00:00.000Z");
      expect(runs[0]?.updatedAt.toISOString()).toBe("2026-03-21T10:05:00.000Z");
      expect(runs[0]?.logs.map((log) => [log.level, log.message])).toEqual([
        ["info", "Legacy workflow queued"],
        ["error", "Legacy workflow failed"],
      ]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
