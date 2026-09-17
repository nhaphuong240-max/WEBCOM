/** Re-export contracts mirrored from admin-api for worker docs. */
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
