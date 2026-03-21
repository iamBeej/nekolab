import { Prisma, PrismaClient, WorkflowLogLevel } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_WORKFLOW_NAME = "Default workflow";
const WORKFLOW_PROCESSING_DELAY_MS = 750;

export const workflowRunWithLogsInclude =
  Prisma.validator<Prisma.WorkflowRunInclude>()({
    logs: {
      orderBy: {
        id: "asc",
      },
    },
  });

export type WorkflowRunWithLogs = Prisma.WorkflowRunGetPayload<{
  include: typeof workflowRunWithLogsInclude;
}>;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function appendWorkflowLog(
  db: DatabaseClient,
  runId: number,
  message: string,
  level: WorkflowLogLevel = "info",
) {
  return db.log.create({
    data: {
      runId,
      level,
      message,
      timestamp: new Date(),
    },
  });
}

export async function createWorkflowRun(name = DEFAULT_WORKFLOW_NAME) {
  const run = await prisma.workflowRun.create({
    data: {
      name,
      status: "pending",
    },
  });

  await appendWorkflowLog(prisma, run.id, "Workflow queued");

  return getWorkflowRunById(run.id);
}

export async function getWorkflowRunById(runId: number) {
  return prisma.workflowRun.findUnique({
    where: {
      id: runId,
    },
    include: workflowRunWithLogsInclude,
  });
}

export async function getLatestWorkflowRun() {
  return prisma.workflowRun.findFirst({
    orderBy: {
      id: "desc",
    },
    include: workflowRunWithLogsInclude,
  });
}

export async function listWorkflowRuns(limit = 8) {
  return prisma.workflowRun.findMany({
    orderBy: {
      id: "desc",
    },
    take: limit,
  });
}

export async function processWorkflowRun(runId: number) {
  try {
    const startedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.workflowRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "running",
          startedAt,
          error: null,
        },
      });

      await appendWorkflowLog(tx, runId, "Workflow started");
    });

    await wait(WORKFLOW_PROCESSING_DELAY_MS);

    const finishedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await appendWorkflowLog(tx, runId, "Workflow executed");

      await tx.workflowRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "success",
          finishedAt,
        },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown workflow error";

    await prisma.$transaction(async (tx) => {
      await appendWorkflowLog(tx, runId, message, "error");

      await tx.workflowRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: message,
        },
      });
    });
  }

  return getWorkflowRunById(runId);
}
