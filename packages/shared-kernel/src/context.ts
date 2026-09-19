/** Request / actor context — mandatory on tenant-owned paths */
export type RequestContext = {
  tenantId: string;
  brandId?: string;
  actorId: string;
  correlationId: string;
  traceId?: string;
  roles: string[];
  /** HR-2 JWT sid */
  sessionId?: string;
};

export const CONTEXT_HEADERS = {
  tenantId: 'x-tenant-id',
  brandId: 'x-brand-id',
  actorId: 'x-actor-id',
  correlationId: 'x-correlation-id',
  traceId: 'x-trace-id',
} as const;
