import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../../lib/api';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function linkUser(formData: FormData) {
  'use server';
  const empId = String(formData.get('employee_id') || '');
  const userId = String(formData.get('user_id') || '').trim();
  if (!empId) return;
  await apiJson(`/v1/admin/hr/employees/${empId}/link-user`, 'POST', {
    user_id: userId || null,
  });
  revalidatePath(`/hr/employees/${empId}`);
}

async function saveDepartment(formData: FormData) {
  'use server';
  const empId = String(formData.get('employee_id') || '');
  const department = String(formData.get('department') || '').trim();
  if (!empId) return;
  await apiJson(`/v1/admin/hr/employees/${empId}`, 'PATCH', { department });
  revalidatePath(`/hr/employees/${empId}`);
}

async function setPin(formData: FormData) {
  'use server';
  const empId = String(formData.get('employee_id') || '');
  const pin = String(formData.get('pin') || '');
  if (!empId || !pin) return;
  await apiJson(`/v1/admin/hr/employees/${empId}/pos-pin`, 'POST', { pin });
  revalidatePath(`/hr/employees/${empId}`);
}

export default async function HrEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let emp: {
    id: string;
    code: string;
    display_name: string;
    title: string | null;
    department: string | null;
    status: string;
    user_id: string | null;
    user: { id: string; email: string } | null;
    stores: Array<{ store_id: string; is_primary: boolean }>;
    pos_pin_set: boolean;
  } | null = null;
  let users: Array<{ id: string; email: string; name: string }> = [];
  let error = '';
  try {
    emp = await apiGet(`/v1/admin/hr/employees/${id}`);
    users = await apiGet('/v1/admin/hr/users');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!emp && !error) notFound();

  return (
    <>
      <PageHeader
        title={emp ? `${emp.code} · ${emp.display_name}` : 'Employee'}
        actions={
          <Link href="/hr/employees" style={{ fontSize: 13 }}>
            ← Employees
          </Link>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      {emp ? (
        <>
          <Panel title="Chi tiết">
            <p style={{ fontSize: 13 }}>
              {emp.title || '—'} · <Badge>{emp.status}</Badge>
              {' · '}
              Dept: {emp.department || '—'}
            </p>
            <p style={{ fontSize: 13 }}>
              Stores:{' '}
              {emp.stores.map((s) => `${s.store_id}${s.is_primary ? ' (primary)' : ''}`).join(', ') ||
                '—'}
            </p>
            <form action={saveDepartment} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input type="hidden" name="employee_id" value={emp.id} />
              <input
                name="department"
                placeholder="Department"
                defaultValue={emp.department || ''}
                style={{ padding: 8 }}
              />
              <Button type="submit" variant="ghost">
                Lưu dept
              </Button>
            </form>
          </Panel>
          <Panel title="POS PIN (HR-3)">
            <p style={{ fontSize: 13 }}>
              Status:{' '}
              <Badge tone={emp.pos_pin_set ? 'accent' : 'muted'}>
                {emp.pos_pin_set ? 'set' : 'not set'}
              </Badge>
            </p>
            <form action={setPin} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="hidden" name="employee_id" value={emp.id} />
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                placeholder="4–8 digits"
                pattern="\d{4,8}"
                style={{ padding: 8 }}
              />
              <Button type="submit">Set PIN</Button>
            </form>
          </Panel>
          <Panel title="Link User Console">
            <p style={{ fontSize: 13 }}>
              Hiện tại:{' '}
              {emp.user ? (
                <Link href={`/hr/users/${emp.user.id}`}>{emp.user.email}</Link>
              ) : (
                'chưa link'
              )}
            </p>
            <form action={linkUser} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="hidden" name="employee_id" value={emp.id} />
              <select name="user_id" defaultValue={emp.user_id || ''} style={{ padding: 8 }}>
                <option value="">— Unlink —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.name})
                  </option>
                ))}
              </select>
              <Button type="submit">Lưu</Button>
            </form>
          </Panel>
        </>
      ) : null}
    </>
  );
}
