export type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  completionMessage: string;
};

export const workflowDefinitions: WorkflowDefinition[] = [
  {
    id: "default-workflow",
    name: "Default workflow",
    description: "Baseline end-to-end workflow used to verify the system loop.",
    completionMessage: "Default workflow executed",
  },
  {
    id: "system-health-check",
    name: "System health check",
    description: "Runs a lightweight health pass across the current workflow stack.",
    completionMessage: "System health check passed",
  },
  {
    id: "neko-preflight",
    name: "Neko preflight",
    description: "Prepares the Neko integration surface without calling external services.",
    completionMessage: "Neko preflight completed",
  },
];

const workflowDefinitionsById = new Map(
  workflowDefinitions.map((definition) => [definition.id, definition]),
);

const workflowDefinitionsByName = new Map(
  workflowDefinitions.map((definition) => [definition.name, definition]),
);

export const DEFAULT_WORKFLOW_ID = workflowDefinitions[0]?.id ?? "default-workflow";

export function listWorkflowDefinitions() {
  return workflowDefinitions;
}

export function getWorkflowDefinitionById(workflowId: string) {
  return workflowDefinitionsById.get(workflowId) ?? null;
}

export function getWorkflowDefinitionByName(workflowName: string) {
  return workflowDefinitionsByName.get(workflowName) ?? null;
}
