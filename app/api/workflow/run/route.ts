import { after } from "next/server";

import {
  createWorkflowRun,
  getLatestWorkflowRun,
  processWorkflowRun,
} from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const run = await createWorkflowRun();

  if (!run) {
    return Response.json(
      {
        message: "Unable to create workflow run",
      },
      {
        status: 500,
      },
    );
  }

  after(async () => {
    await processWorkflowRun(run.id);
  });

  return Response.json(run, {
    status: 202,
  });
}

export async function GET() {
  const run = await getLatestWorkflowRun();

  return Response.json(run);
}
