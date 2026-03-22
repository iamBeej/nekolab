import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  disconnectExpenseTracker,
  executeExpenseCommand,
} from "@/lib/expense-tracker.mjs";
import { prismaRuntime } from "@/lib/prisma-runtime.mjs";

const execFileAsync = promisify(execFile);
const testDatabasePath = path.join(process.cwd(), "prisma", "vitest.db");
const schemaSql = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "Person" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "personId" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person" ("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS "Expense_personId_timestamp_idx"
  ON "Expense"("personId", "timestamp");
`;

async function ensureTestSchema() {
  for (const statement of schemaSql
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await prismaRuntime.$executeRawUnsafe(`${statement};`);
  }
}

async function resetTestDatabase() {
  await prismaRuntime.expense.deleteMany();
  await prismaRuntime.person.deleteMany();
  await prismaRuntime.$executeRawUnsafe(
    "DELETE FROM sqlite_sequence WHERE name IN ('Expense', 'Person');",
  );
}

describe.sequential("expense tracker commands", () => {
  beforeAll(async () => {
    await prismaRuntime.$connect();
    await ensureTestSchema();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectExpenseTracker();

    if (fs.existsSync(testDatabasePath)) {
      fs.rmSync(testDatabasePath);
    }
  });

  test("adds an expense and returns the person's updated total", async () => {
    const output = await executeExpenseCommand(
      "expense add | person:Juliet | amount:500 | item:groceries",
    );

    expect(output).toBe("[OK] Expense added\nJuliet total: \u20b1500");
  });

  test("returns a person's total across multiple expenses", async () => {
    await executeExpenseCommand(
      "expense add | person:Juliet | amount:500 | item:groceries",
    );
    await executeExpenseCommand(
      "expense add | person:Juliet | amount:150.50 | item:coffee beans",
    );

    const output = await executeExpenseCommand("expense total | person:Juliet");

    expect(output).toBe("Juliet total expenses: \u20b1650.5");
  });

  test("returns the overall total across people", async () => {
    await executeExpenseCommand(
      "expense add | person:Juliet | amount:500 | item:groceries",
    );
    await executeExpenseCommand(
      "expense add | person:Romeo | amount:299.99 | item:snacks",
    );

    const output = await executeExpenseCommand("expense total");

    expect(output).toBe("Total expenses: \u20b1799.99");
  });

  test("rejects missing required fields", async () => {
    await expect(
      executeExpenseCommand("expense add | person:Juliet | amount:500"),
    ).rejects.toThrow("Missing required field 'item'");
  });

  test("rejects non-numeric amounts", async () => {
    await expect(
      executeExpenseCommand(
        "expense add | person:Juliet | amount:abc | item:groceries",
      ),
    ).rejects.toThrow("Amount must be numeric");
  });

  test("runs through the CLI entry point", async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      "scripts/expense-cli.mjs",
      "expense add | person:Juliet | amount:500 | item:groceries",
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    expect(stdout.trim()).toBe("[OK] Expense added\nJuliet total: \u20b1500");
  });
});
