export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlation_id?: string;
    trace_id?: string;
  };
};

export function errorEnvelope(
  code: string,
  message: string,
  opts?: { details?: unknown; correlationId?: string; traceId?: string },
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      details: opts?.details,
      correlation_id: opts?.correlationId,
      trace_id: opts?.traceId,
    },
  };
}
