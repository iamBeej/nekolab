import { after } from "next/server";

import {
  createWorkflowRun,
  getLatestWorkflowRun,
  processWorkflowRun,
} from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const run = await createWorkflowRun();

    after(async () => {
      await processWorkflowRun(run.id);
    });

    return Response.json(run, {
      status: 202,
    });
  } catch (error) {
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
