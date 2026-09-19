import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function createRole(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const permsRaw = String(formData.get('permissions') || '');
  const permissions = permsRaw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!code || !name || !permissions.length) return;
  await apiJson('/v1/admin/hr/roles', 'POST', { code, name, description, permissions });
  revalidatePath('/hr/roles');
}

async function deleteRole(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;
  await apiJson(`/v1/admin/hr/roles/${id}`, 'DELETE', {});
  revalidatePath('/hr/roles');
}

export default async function HrRolesPage() {
  let catalog: {
    roles: Array<{
      id?: string;
      code: string;
      name: string;
      description: string;
      system?: boolean;
      permissions: string[];
      default_scope_type: string;
    }>;
    permissions: Array<{ code: string; sensitive: boolean }>;
  } | null = null;
  let error = '';
  try {
    catalog = await apiGet('/v1/admin/hr/catalog');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const system = catalog?.roles.filter((r) => r.system) ?? [];
  const custom = catalog?.roles.filter((r) => !r.system) ?? [];

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="HR-3 · system (read-only) + custom tenant roles"
        actions={<Badge tone="accent">HR-3</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Tạo custom role">
        <form action={createRole} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <input name="code" placeholder="code (vd: floor_lead)" required style={{ padding: 8 }} />
            <input name="name" placeholder="Tên hiển thị" required style={{ padding: 8 }} />
            <input name="description" placeholder="Mô tả" style={{ padding: 8, minWidth: 200 }} />
          </div>
          <input
            name="permissions"
            placeholder="permissions (cách nhau dấu phẩy): hr.employee.read, pos.sell"
            required
            style={{ padding: 8 }}
          />
          <div>
            <Button type="submit">Tạo role</Button>
          </div>
        </form>
        <p style={{ fontSize: 12, color: '#6b5559', marginTop: 8 }}>
          Không ghi đè system code; không gồm secret.manage.
        </p>
      </Panel>

      {custom.map((r) => (
        <Panel key={r.code} title={`${r.name} (${r.code})`}>
          <Badge tone="accent">custom</Badge>
          <p style={{ fontSize: 13, color: '#6b5559' }}>{r.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {r.permissions.map((p) => (
              <Badge key={p} tone="muted">
                {p}
              </Badge>
            ))}
          </div>
          {r.id ? (
            <form action={deleteRole} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={r.id} />
              <Button type="submit" variant="ghost">
                Xóa
              </Button>
            </form>
          ) : null}
        </Panel>
      ))}

      {system.map((r) => (
        <Panel key={r.code} title={`${r.name} (${r.code})`}>
          <Badge tone="muted">system</Badge>
          <p style={{ fontSize: 13, color: '#6b5559' }}>{r.description}</p>
          <p style={{ fontSize: 12 }}>Default scope: {r.default_scope_type}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {r.permissions.map((p) => (
              <Badge key={p} tone="muted">
                {p}
              </Badge>
            ))}
          </div>
        </Panel>
      ))}
    </>
  );
}
