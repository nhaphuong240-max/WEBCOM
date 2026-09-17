/**
 * A4 worker entry.
 * Durable PublishTheme / GoLiveValidation workflows run in admin-api via
 * FEATURE_TEMPORAL stub by default. This process documents the task queue and
 * can be extended with @temporalio/worker when TEMPORAL_ADDRESS is set.
 */
const address = process.env.TEMPORAL_ADDRESS?.trim();
const queue = process.env.TEMPORAL_TASK_QUEUE || 'webcom-publish';
const ns = process.env.TEMPORAL_NAMESPACE || 'webcom';

// eslint-disable-next-line no-console
console.log(
  JSON.stringify(
    {
      service: '@ptt/worker',
      wave: 'A4',
      mode: address ? 'temporal_remote' : 'companion_stub',
      temporal_address: address || null,
      namespace: ns,
      task_queue: queue,
      workflows: ['PublishThemeWorkflow', 'GoLiveValidationWorkflow'],
      hint: address
        ? 'Install @temporalio/worker and register activities against admin-api.'
        : 'Workflows execute in admin-api (temporal_stub). Set TEMPORAL_ADDRESS for cluster.',
    },
    null,
    2,
  ),
);

if (!address) {
  // Keep process idle for systemd companion without exiting immediately in start scripts
  const keep = process.env.WORKER_KEEPALIVE === '1';
  if (keep) {
    setInterval(() => undefined, 60_000).unref();
  }
}
