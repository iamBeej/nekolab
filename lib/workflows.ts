import {
  Prisma,
  PrismaClient,
  WorkflowLogLevel,
  WorkflowRunStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WORKFLOW_ID,
  getWorkflowDefinitionById,
  getWorkflowDefinitionByName,
} from "@/lib/workflow-definitions";

const DEFAULT_WORKFLOW_NAME =
  getWorkflowDefinitionById(DEFAULT_WORKFLOW_ID)?.name ?? "Default workflow";
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

export class WorkflowDefinitionNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Workflow definition '${workflowId}' was not found`);
    this.name = "WorkflowDefinitionNotFoundError";
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

export async function createWorkflowRunForDefinition(
  workflowId = DEFAULT_WORKFLOW_ID,
) {
  const workflowDefinition = getWorkflowDefinitionById(workflowId);

  if (!workflowDefinition) {
    throw new WorkflowDefinitionNotFoundError(workflowId);
  }

  return createWorkflowRun(workflowDefinition.name);
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

async function getWorkflowRunName(runId: number) {
  const run = await prisma.workflowRun.findUnique({
    where: {
      id: runId,
    },
    select: {
      name: true,
    },
  });

  return run?.name ?? null;
}

function getWorkflowCompletionMessage(workflowRunName: string | null) {
  if (!workflowRunName) {
    return "Workflow executed";
  }

  return (
    getWorkflowDefinitionByName(workflowRunName)?.completionMessage ??
    "Workflow executed"
  );
}

async function completeWorkflowRun(runId: number, message: string) {
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

    await appendWorkflowLog(tx, runId, message);
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

    const workflowRunName = await getWorkflowRunName(runId);
    await completeWorkflowRun(
      runId,
      getWorkflowCompletionMessage(workflowRunName),
    );
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
