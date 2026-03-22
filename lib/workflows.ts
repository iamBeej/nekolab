import {
  Prisma,
  PrismaClient,
  WorkflowLogLevel,
  WorkflowRunStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_WORKFLOW_NAME = "Default workflow";
const WORKFLOW_PROCESSING_DELAY_MS = 750;
const FAILABLE_WORKFLOW_RUN_STATUSES: WorkflowRunStatus[] = [
  "pending",
  "running",
];

class WorkflowRunStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowRunStateError";
  }
}

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
  return prisma.$transaction((tx) => {
    return tx.workflowRun.create({
      data: {
        name,
        status: "pending",
        logs: {
          create: {
            message: "Workflow queued",
          },
        },
      },
      include: workflowRunWithLogsInclude,
    });
  });
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

async function transitionWorkflowRunToRunning(runId: number) {
  const startedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const result = await tx.workflowRun.updateMany({
      where: {
        id: runId,
        status: "pending",
      },
      data: {
        status: "running",
        startedAt,
        finishedAt: null,
        error: null,
      },
    });

    if (result.count === 0) {
      throw new WorkflowRunStateError(
        `Workflow run ${runId} is not pending and cannot be started`,
      );
    }

    await appendWorkflowLog(tx, runId, "Workflow started");
  });
}

async function completeWorkflowRun(runId: number) {
  const finishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const result = await tx.workflowRun.updateMany({
      where: {
        id: runId,
        status: "running",
      },
      data: {
        status: "success",
        finishedAt,
      },
    });

    if (result.count === 0) {
      throw new WorkflowRunStateError(
        `Workflow run ${runId} is not running and cannot be completed`,
      );
    }

    await appendWorkflowLog(tx, runId, "Workflow executed");
  });
}

async function failWorkflowRun(runId: number, message: string) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.workflowRun.updateMany({
      where: {
        id: runId,
        status: {
          in: FAILABLE_WORKFLOW_RUN_STATUSES,
        },
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: message,
      },
    });

    if (result.count === 0) {
      return false;
    }

    await appendWorkflowLog(tx, runId, message, "error");

    return true;
  });
}

export async function processWorkflowRun(runId: number) {
  try {
    await transitionWorkflowRunToRunning(runId);

    await wait(WORKFLOW_PROCESSING_DELAY_MS);

    await completeWorkflowRun(runId);
  } catch (error) {
    if (error instanceof WorkflowRunStateError) {
      return getWorkflowRunById(runId);
    }

    const message =
      error instanceof Error ? error.message : "Unknown workflow error";

    await failWorkflowRun(runId, message);
  }

  return getWorkflowRunById(runId);
}
