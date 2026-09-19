import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../../lib/api';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function suspendUser(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;
  await apiJson(`/v1/admin/hr/users/${id}/suspend`, 'POST', {});
  revalidatePath(`/hr/users/${id}`);
  revalidatePath('/hr/users');
}

async function reactivateUser(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;
  await apiJson(`/v1/admin/hr/users/${id}/reactivate`, 'POST', {});
  revalidatePath(`/hr/users/${id}`);
  revalidatePath('/hr/users');
}

async function assignRoles(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const role = String(formData.get('role_code') || 'readonly');
  const scopeType = String(formData.get('scope_type') || 'tenant');
  const storeId = String(formData.get('store_id') || '').trim();
  if (!id) return;
  await apiJson(`/v1/admin/hr/users/${id}/roles`, 'POST', {
    role_codes: [role],
    scope:
      scopeType === 'store' && storeId
        ? { type: 'store', ids: [storeId] }
        : { type: 'tenant' },
  });
  revalidatePath(`/hr/users/${id}`);
}

async function revokeSession(formData: FormData) {
  'use server';
  const sessionId = String(formData.get('session_id') || '');
  const userId = String(formData.get('user_id') || '');
  if (!sessionId) return;
  await apiJson(`/v1/admin/hr/sessions/${sessionId}/revoke`, 'POST', {});
  if (userId) revalidatePath(`/hr/users/${userId}`);
}

async function enrollMfa(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;
  await apiJson(`/v1/admin/hr/users/${id}/mfa/enroll`, 'POST', {});
  revalidatePath(`/hr/users/${id}`);
}

async function verifyMfa(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const code = String(formData.get('code') || '');
  if (!id || !code) return;
  await apiJson(`/v1/admin/hr/users/${id}/mfa/verify`, 'POST', { code });
  revalidatePath(`/hr/users/${id}`);
}

export default async function HrUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let user: {
    id: string;
    email: string;
    name: string;
    status: string;
    roles: string[];
    permissions: string[];
    assignments: Array<{ role_code: string; scope: { type: string; ids?: string[] } }>;
    employee: { id: string; code: string; display_name: string } | null;
  } | null = null;
  let sessions: Array<{
    id: string;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
    last_seen_at: string;
    revoked_at: string | null;
    active: boolean;
  }> = [];
  let error = '';
  try {
    user = await apiGet(`/v1/admin/hr/users/${id}`);
    sessions = await apiGet(`/v1/admin/hr/users/${id}/sessions`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!user && !error) notFound();

  return (
    <>
      <PageHeader
        title={user?.name || 'User'}
        description={user?.email}
        actions={
          <Link href="/hr/users" style={{ fontSize: 13 }}>
            ← Users
          </Link>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      {user ? (
        <>
          <Panel title="Hồ sơ">
            <p style={{ fontSize: 13 }}>
              Status <Badge tone={user.status === 'active' ? 'accent' : 'warn'}>{user.status}</Badge>
              {' · '}
              Roles: {user.roles.join(', ')}
            </p>
            {user.employee ? (
              <p style={{ fontSize: 13 }}>
                Employee:{' '}
                <Link href={`/hr/employees/${user.employee.id}`}>
                  {user.employee.code} — {user.employee.display_name}
                </Link>
              </p>
            ) : (
              <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa link Employee</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {user.status !== 'suspended' ? (
                <form action={suspendUser}>
                  <input type="hidden" name="id" value={user.id} />
                  <Button type="submit" variant="ghost">
                    Suspend
                  </Button>
                </form>
              ) : (
                <form action={reactivateUser}>
                  <input type="hidden" name="id" value={user.id} />
                  <Button type="submit">Reactivate</Button>
                </form>
              )}
            </div>
          </Panel>
          <Panel title="Gán role + scope">
            <form action={assignRoles} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input type="hidden" name="id" value={user.id} />
              <select name="role_code" defaultValue={user.roles[0] || 'readonly'} style={{ padding: 8 }}>
                {[
                  'owner',
                  'admin',
                  'ops',
                  'store_manager',
                  'cashier',
                  'website_editor',
                  'website_publisher',
                  'analyst',
                  'readonly',
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select name="scope_type" defaultValue="tenant" style={{ padding: 8 }}>
                <option value="tenant">tenant</option>
                <option value="store">store</option>
              </select>
              <input
                name="store_id"
                placeholder="storefront id (nếu store)"
                defaultValue="sf_aura"
                style={{ padding: 8 }}
              />
              <Button type="submit">Lưu roles</Button>
            </form>
          </Panel>
          <Panel title="Sessions (HR-2)">
            {sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có session</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: '1px solid #eee',
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <Badge tone={s.active ? 'accent' : 'muted'}>{s.active ? 'active' : 'revoked'}</Badge>{' '}
                      {s.ip || '—'} · {s.created_at}
                      <br />
                      <span style={{ color: '#6b5559', fontSize: 12 }}>{s.user_agent || s.id}</span>
                    </span>
                    {s.active ? (
                      <form action={revokeSession}>
                        <input type="hidden" name="session_id" value={s.id} />
                        <input type="hidden" name="user_id" value={user.id} />
                        <Button type="submit" variant="ghost">
                          Revoke
                        </Button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="MFA stub (FEATURE_HR_MFA)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <form action={enrollMfa}>
                <input type="hidden" name="id" value={user.id} />
                <Button type="submit" variant="ghost">
                  Enroll
                </Button>
              </form>
              <form action={verifyMfa} style={{ display: 'flex', gap: 8 }}>
                <input type="hidden" name="id" value={user.id} />
                <input name="code" placeholder="000000" defaultValue="000000" style={{ padding: 8 }} />
                <Button type="submit">Verify</Button>
              </form>
            </div>
          </Panel>
          <Panel title="Permissions (effective)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.permissions.map((p) => (
                <Badge key={p} tone="muted">
                  {p}
                </Badge>
              ))}
            </div>
          </Panel>
        </>
      ) : null}
    </>
  );
}
