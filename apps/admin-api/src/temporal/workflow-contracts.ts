/** Shared A4 workflow contracts (admin-api stub + apps/worker). */

export type PublishThemeInput = {
  tenantId: string;
  storefrontId: string;
  actorId: string;
  jobId: string;
  workflowId: string;
  runId: string;
};

export type GoLiveValidationInput = {
  tenantId: string;
  storefrontId: string;
  actorId?: string;
};

export const WORKFLOW_NAMES = {
  publishTheme: 'PublishThemeWorkflow',
  goLiveValidation: 'GoLiveValidationWorkflow',
} as const;

export const PUBLISH_STEPS = [
  'validate_checklist',
  'backup_current',
  'publish_atomic',
  'revalidate',
  'health_window',
  'audit_notify',
] as const;

export type PublishStep = (typeof PUBLISH_STEPS)[number];
