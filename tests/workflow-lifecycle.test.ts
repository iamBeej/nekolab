import fs from "node:fs";
import path from "node:path";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

vi.mock("next/server", () => ({
  after: () => undefined,
}));

import {
  GET as listWorkflowDefinitionsRoute,
} from "@/app/api/workflow/definitions/route";
import { GET as getLatestRunRoute } from "@/app/api/workflow/run/route";
import { POST as queueWorkflowRunRoute } from "@/app/api/workflow/run/route";
import { GET as getRunByIdRoute } from "@/app/api/workflow/runs/[id]/route";
import { GET as listWorkflowRunsRoute } from "@/app/api/workflow/runs/route";
import { prisma } from "@/lib/prisma";
import {
  createWorkflowRun,
  createWorkflowRunForDefinition,
  processWorkflowRun,
} from "@/lib/workflows";

const testDatabasePath = path.join(process.cwd(), "prisma", "vitest.db");
const schemaSql = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "error" TEXT
  );

  CREATE INDEX IF NOT EXISTS "WorkflowRun_status_createdAt_idx"
  ON "WorkflowRun"("status", "createdAt");

  CREATE TABLE IF NOT EXISTS "Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "WorkflowRun" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS "Log_runId_id_idx" ON "Log"("runId", "id");
`;

async function ensureTestSchema() {
  for (const statement of schemaSql
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await prisma.$executeRawUnsafe(`${statement};`);
  }
}

async function resetTestDatabase() {
  await prisma.log.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.$executeRawUnsafe(
    "DELETE FROM sqlite_sequence WHERE name IN ('Log', 'WorkflowRun');",
  );
}

describe.sequential("workflow lifecycle", () => {
  beforeAll(async () => {
    await prisma.$connect();
    await ensureTestSchema();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();

    if (fs.existsSync(testDatabasePath)) {
      fs.rmSync(testDatabasePath);
    }
  });

  test("creates a pending run with an initial queued log", async () => {
    const run = await createWorkflowRun("Test workflow");

    expect(run.name).toBe("Test workflow");
    expect(run.status).toBe("pending");
    expect(run.logs).toHaveLength(1);
    expect(run.logs[0]?.message).toBe("Workflow queued");
    expect(run.logs[0]?.level).toBe("info");
  });

  test("processes a run from pending to success", async () => {
    const run = await createWorkflowRun();

    const processedRun = await processWorkflowRun(run.id);

    expect(processedRun?.status).toBe("success");
    expect(processedRun?.startedAt).toBeTruthy();
    expect(processedRun?.finishedAt).toBeTruthy();
    expect(processedRun?.error).toBeNull();
    expect(processedRun?.logs.map((log) => log.message)).toEqual([
      "Workflow queued",
      "Workflow started",
      "Default workflow executed",
    ]);
  });

  test("processes a selected workflow definition with its own completion log", async () => {
    const run = await createWorkflowRunForDefinition("system-health-check");

    const processedRun = await processWorkflowRun(run.id);

    expect(processedRun?.name).toBe("System health check");
    expect(processedRun?.status).toBe("success");
    expect(processedRun?.logs.map((log) => log.message)).toEqual([
      "Workflow queued",
      "Workflow started",
      "System health check passed",
    ]);
  });

  test("does not rewrite a completed run when processed again", async () => {
    const run = await createWorkflowRun();
    const processedRun = await processWorkflowRun(run.id);
    const firstFinishedAt = processedRun?.finishedAt?.toISOString();

    const secondProcessedRun = await processWorkflowRun(run.id);

    expect(secondProcessedRun?.status).toBe("success");
    expect(secondProcessedRun?.finishedAt?.toISOString()).toBe(firstFinishedAt);
    expect(secondProcessedRun?.logs).toHaveLength(3);
  });

  test("marks the run as failed when completion errors", async () => {
    const run = await createWorkflowRun();
    const originalTransaction = prisma.$transaction.bind(prisma);
    let transactionCalls = 0;

    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementation(((...args: Parameters<typeof prisma.$transaction>) => {
        transactionCalls += 1;

        if (transactionCalls === 2) {
          throw new Error("Simulated workflow failure");
        }

        return originalTransaction(...args);
      }) as typeof prisma.$transaction);

    const failedRun = await processWorkflowRun(run.id);

    transactionSpy.mockRestore();

    expect(failedRun?.status).toBe("failed");
    expect(failedRun?.error).toBe("Simulated workflow failure");
    expect(failedRun?.finishedAt).toBeTruthy();
    expect(failedRun?.logs.map((log) => [log.level, log.message])).toEqual([
      ["info", "Workflow queued"],
      ["info", "Workflow started"],
      ["error", "Simulated workflow failure"],
    ]);
  });

  test("returns the latest run with logs from the latest-run API", async () => {
    await createWorkflowRun("Older run");
    const latestRun = await createWorkflowRun("Latest run");

    const response = await getLatestRunRoute();
    const body = (await response.json()) as {
      id: number;
      name: string;
      logs: Array<{ message: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.id).toBe(latestRun.id);
    expect(body.name).toBe("Latest run");
    expect(body.logs.map((log) => log.message)).toEqual(["Workflow queued"]);
  });

  test("returns the available workflow definitions", async () => {
    const response = await listWorkflowDefinitionsRoute();
    const body = (await response.json()) as Array<{
      id: string;
      name: string;
    }>;

    expect(response.status).toBe(200);
    expect(body.map((workflowDefinition) => workflowDefinition.id)).toEqual([
      "default-workflow",
      "system-health-check",
      "winter-preflight",
    ]);
    expect(body[1]?.name).toBe("System health check");
  });

  test("queues the selected workflow definition from the trigger API", async () => {
    const response = await queueWorkflowRunRoute(
      new Request("http://localhost/api/workflow/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: "system-health-check",
        }),
      }),
    );
    const body = (await response.json()) as {
      id: number;
      name: string;
      logs: Array<{ message: string }>;
    };

    expect(response.status).toBe(202);
    expect(body.name).toBe("System health check");
    expect(body.logs.map((log) => log.message)).toEqual(["Workflow queued"]);
  });

  test("rejects unknown workflow definitions from the trigger API", async () => {
    const response = await queueWorkflowRunRoute(
      new Request("http://localhost/api/workflow/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: "missing-workflow",
        }),
      }),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe(
      "Workflow definition 'missing-workflow' was not found",
    );
  });

  test("returns limited workflow history from the runs API", async () => {
    await createWorkflowRun("First run");
    const latestRun = await createWorkflowRun("Second run");

    const response = await listWorkflowRunsRoute(
      new Request("http://localhost/api/workflow/runs?limit=1"),
    );
    const body = (await response.json()) as Array<{ id: number; name: string }>;

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]?.id).toBe(latestRun.id);
    expect(body[0]?.name).toBe("Second run");
  });

  test("rejects invalid run-history limits", async () => {
    const response = await listWorkflowRunsRoute(
      new Request("http://localhost/api/workflow/runs?limit=0"),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("Invalid limit");
  });

  test("returns a single workflow run by id and 404s when missing", async () => {
    const run = await createWorkflowRun("Lookup run");

    const foundResponse = await getRunByIdRoute(
      new Request(`http://localhost/api/workflow/runs/${run.id}`),
      {
        params: Promise.resolve({
          id: String(run.id),
        }),
      },
    );
    const foundBody = (await foundResponse.json()) as {
      id: number;
      name: string;
      logs: Array<{ message: string }>;
    };

    expect(foundResponse.status).toBe(200);
    expect(foundBody.id).toBe(run.id);
    expect(foundBody.name).toBe("Lookup run");
    expect(foundBody.logs.map((log) => log.message)).toEqual([
      "Workflow queued",
    ]);

    const missingResponse = await getRunByIdRoute(
      new Request("http://localhost/api/workflow/runs/9999"),
      {
        params: Promise.resolve({
          id: "9999",
        }),
      },
    );
    const missingBody = (await missingResponse.json()) as { message: string };

    expect(missingResponse.status).toBe(404);
    expect(missingBody.message).toBe("Workflow run not found");
  });
});
