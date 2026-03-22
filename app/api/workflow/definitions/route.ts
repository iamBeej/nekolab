import { listWorkflowDefinitions } from "@/lib/workflow-definitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(listWorkflowDefinitions());
}
