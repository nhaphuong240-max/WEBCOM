import {
  AppError,
  getRoleTemplate,
  isHrPermission,
  resolvePermissions,
  type HrPermission,
} from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { PrismaService } from '../prisma/prisma.service';

export type DataScope = {
  type: 'tenant' | 'brand' | 'store' | 'warehouse' | 'channel';
  ids?: string[];
};

export function hrFeature(name: string, fallback = true): boolean {
  const raw = process.env[`FEATURE_${name.toUpperCase().replace(/\./g, '_')}`];
  if (raw === undefined) return fallback;
  return raw === '1' || raw === 'true';
}

export function requireHrIam(): void {
  if (!hrFeature('hr.iam')) throw AppError.validation('Feature hr.iam disabled');
}

export function requireHrEmployee(): void {
  if (!hrFeature('hr.employee')) throw AppError.validation('Feature hr.employee disabled');
}

export function parseScope(raw: unknown): DataScope {
  if (!raw || typeof raw !== 'object') return { type: 'tenant' };
  const o = raw as { type?: string; ids?: string[] };
  const type = (o.type || 'tenant') as DataScope['type'];
  if (!['tenant', 'brand', 'store', 'warehouse', 'channel'].includes(type)) {
    return { type: 'tenant' };
  }
  return {
    type,
    ids: Array.isArray(o.ids) ? o.ids.filter((x) => typeof x === 'string') : undefined,
  };
}

/** Resolve effective role codes for actor (DB preferred, then JWT, then owner under AUTH_DEV_BYPASS). */
export async function resolveActorRoles(
  prisma: PrismaService,
  ctx: RequestContext,
): Promise<string[]> {
  const user = await prisma.db.user.findFirst({
    where: { id: ctx.actorId, tenantId: ctx.tenantId },
    include: { roleAssignments: true },
  });
  if (user) {
    if (user.status === 'suspended' || user.status === 'deleted') {
      throw AppError.forbidden('User suspended');
    }
    if (user.roleAssignments.length) {
      return user.roleAssignments.map((a) => a.roleCode);
    }
    if (user.roles.length) return user.roles;
  }
  if (ctx.roles?.length && !(ctx.roles.length === 1 && ctx.roles[0] === 'viewer')) {
    return ctx.roles;
  }
  if (process.env.AUTH_DEV_BYPASS === 'true') return ['owner'];
  return ctx.roles?.length ? ctx.roles : ['viewer'];
}

/** System templates + tenant custom roles (HR-3). */
export async function resolveEffectivePermissions(
  prisma: PrismaService,
  tenantId: string,
  roleCodes: string[],
): Promise<HrPermission[]> {
  const set = new Set<HrPermission>(resolvePermissions(roleCodes));
  const unknown = roleCodes.filter((c) => !getRoleTemplate(c));
  if (!unknown.length) return [...set];
  const customs = await prisma.db.tenantRoleTemplate.findMany({
    where: { tenantId, code: { in: unknown } },
  });
  for (const r of customs) {
    for (const p of r.permissions) {
      if (isHrPermission(p)) set.add(p);
    }
  }
  return [...set];
}

export async function assertPermission(
  prisma: PrismaService,
  ctx: RequestContext,
  permission: HrPermission,
): Promise<string[]> {
  const roles = await resolveActorRoles(prisma, ctx);
  const perms = await resolveEffectivePermissions(prisma, ctx.tenantId, roles);
  if (!perms.includes(permission)) {
    throw AppError.forbiddenPermission(permission);
  }
  return roles;
}

export async function resolveActorScopes(
  prisma: PrismaService,
  ctx: RequestContext,
): Promise<DataScope[]> {
  const user = await prisma.db.user.findFirst({
    where: { id: ctx.actorId, tenantId: ctx.tenantId },
    include: { roleAssignments: true },
  });
  if (!user?.roleAssignments.length) {
    return [{ type: 'tenant' }];
  }
  return user.roleAssignments.map((a) => parseScope(a.scope));
}

/** Store scope → storefront id filter. null = unrestricted; [] = deny all. */
export function storefrontIdsFromScopes(scopes: DataScope[]): string[] | null {
  if (!scopes.length) return null;
  if (scopes.some((s) => s.type === 'tenant')) return null;
  const storeScopes = scopes.filter((s) => s.type === 'store');
  if (!storeScopes.length) return null;
  const ids = Array.from(new Set(storeScopes.flatMap((s) => s.ids || [])));
  return ids;
}

/** Store scope: allow if any assignment is tenant-wide OR store id listed. */
export function canAccessStore(scopes: DataScope[], storefrontId: string): boolean {
  const ids = storefrontIdsFromScopes(scopes);
  if (ids === null) return true;
  return ids.includes(storefrontId);
}

export function effectivePermissions(roles: string[]) {
  return resolvePermissions(roles);
}
