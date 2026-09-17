/**
 * W0 observability stub — enable OpenTelemetry exporter in W1/W2.
 * Set OTEL_ENABLED=true when collector is available.
 */
export function initObservability(serviceName: string) {
  if (process.env.OTEL_ENABLED === 'true') {
    // Placeholder: wire @opentelemetry/sdk-node here
    console.info(`[otel] enabled for ${serviceName} (exporter — wire SDK next)`);
  }
  if (process.env.SENTRY_DSN) {
    console.info(`[sentry] DSN present for ${serviceName} (wire @sentry/node next)`);
  }
}
