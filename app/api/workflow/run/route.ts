import { after } from "next/server";

import {
  createWorkflowRunForDefinition,
  getLatestWorkflowRun,
  processWorkflowRun,
  WorkflowDefinitionNotFoundError,
} from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class InvalidWorkflowRunRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWorkflowRunRequestError";
  }
}

async function getRequestedWorkflowId(request: Request) {
  const requestBody = await request.text();

  if (!requestBody) {
    return null;
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(requestBody);
  } catch {
    throw new InvalidWorkflowRunRequestError("Invalid JSON body");
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    throw new InvalidWorkflowRunRequestError("Request body must be an object");
  }

  const workflowId = (parsedBody as { workflowId?: unknown }).workflowId;

  if (workflowId === undefined) {
    return null;
  }

  if (typeof workflowId !== "string" || workflowId.length === 0) {
    throw new InvalidWorkflowRunRequestError("Invalid workflowId");
  }

  return workflowId;
}

export async function POST(request: Request) {
  try {
    const workflowId = await getRequestedWorkflowId(request);
    const run = await createWorkflowRunForDefinition(workflowId ?? undefined);

    after(async () => {
      await processWorkflowRun(run.id);
    });

    return Response.json(run, {
      status: 202,
    });
  } catch (error) {
    if (
      error instanceof InvalidWorkflowRunRequestError ||
      error instanceof WorkflowDefinitionNotFoundError
    ) {
      return Response.json(
        {
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to create workflow run";

    return Response.json(
      {
        message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET() {
  const run = await getLatestWorkflowRun();

  return Response.json(run);
}
