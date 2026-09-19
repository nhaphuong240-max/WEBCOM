import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function inviteUser(formData: FormData) {
  'use server';
  const email = String(formData.get('email') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const role = String(formData.get('role_code') || 'website_editor');
  if (!email) return;
  await apiJson('/v1/admin/hr/users/invite', 'POST', {
    email,
    name: name || undefined,
    role_codes: [role],
    scope: { type: 'tenant' },
  });
  revalidatePath('/hr/users');
}

async function exportUsers(formData: FormData) {
  'use server';
  const reason = String(formData.get('reason') || '').trim();
  if (reason.length < 5) return;
  await apiJson('/v1/admin/hr/users/export', 'POST', { reason });
  revalidatePath('/hr/users');
}

export default async function HrUsersPage() {
  let users: Array<{
    id: string;
    email: string;
    name: string;
    status: string;
    roles: string[];
    employee_id?: string | null;
  }> = [];
  let error = '';
  try {
    users = await apiGet('/v1/admin/hr/users');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="HR-2 · mời / khóa / gán role · PII export"
        actions={<Badge tone="accent">HR-2</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Mời user">
        <form action={inviteUser} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="email" type="email" placeholder="email@" required style={{ padding: 8 }} />
          <input name="name" placeholder="Tên" style={{ padding: 8 }} />
          <select name="role_code" defaultValue="website_editor" style={{ padding: 8 }}>
            <option value="admin">admin</option>
            <option value="ops">ops</option>
            <option value="store_manager">store_manager</option>
            <option value="cashier">cashier</option>
            <option value="website_editor">website_editor</option>
            <option value="website_publisher">website_publisher</option>
            <option value="analyst">analyst</option>
            <option value="readonly">readonly</option>
          </select>
          <Button type="submit">Gửi invite</Button>
        </form>
        <p style={{ fontSize: 12, color: '#6b5559', marginTop: 8 }}>
          Invite trả link/token trong response API (stub — copy từ Network hoặc e2e). SMTP sau.
        </p>
      </Panel>

      <Panel title="Export PII (audit reason)">
        <form action={exportUsers} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input
            name="reason"
            placeholder="Lý do export (≥5 ký tự)"
            required
            minLength={5}
            style={{ padding: 8, minWidth: 240 }}
          />
          <Button type="submit" variant="ghost">
            Export CSV
          </Button>
        </form>
      </Panel>

      <Panel title={`Danh sách (${users.length})`}>
        <ul style={{ fontSize: 13, listStyle: 'none', padding: 0 }}>
          {users.map((u) => (
            <li
              key={u.id}
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 10,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                paddingBottom: 8,
              }}
            >
              <Link href={`/hr/users/${u.id}`} style={{ fontWeight: 600 }}>
                {u.name}
              </Link>
              <span>{u.email}</span>
              <Badge tone={u.status === 'active' ? 'accent' : 'muted'}>{u.status}</Badge>
              <span style={{ color: '#6b5559' }}>{u.roles.join(', ')}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
