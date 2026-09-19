import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function createLeaveRequest(formData: FormData) {
  'use server';
  const employeeId = String(formData.get('employee_id') || '').trim();
  const leaveType = String(formData.get('leave_type') || 'annual').trim();
  const startDate = String(formData.get('start_date') || '').trim();
  const endDate = String(formData.get('end_date') || '').trim();
  const days = Number(formData.get('days') || 1);
  if (!employeeId || !startDate || !endDate) return;
  await apiJson('/v1/admin/hrm/leave/requests', 'POST', {
    employee_id: employeeId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    days,
  });
  revalidatePath('/hrm/leave');
}

async function approveLeave(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;
  await apiJson(`/v1/admin/hrm/leave/requests/${id}/approve`, 'POST', {});
  revalidatePath('/hrm/leave');
}

async function rejectLeave(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const reason = String(formData.get('reason') || '').trim();
  if (!id) return;
  await apiJson(`/v1/admin/hrm/leave/requests/${id}/reject`, 'POST', {
    reason: reason || undefined,
  });
  revalidatePath('/hrm/leave');
}

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  created_at?: string;
};

type LeaveBalance = {
  leave_type: string;
  balance_days: number;
};

export default async function HrmLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ employee_id?: string }>;
}) {
  const sp = await searchParams;
  const balanceQs = sp.employee_id ? `?employee_id=${encodeURIComponent(sp.employee_id)}` : '';

  let rows: LeaveRequest[] = [];
  let balances: LeaveBalance[] = [];
  let error = '';
  try {
    rows = await apiGet('/v1/admin/hrm/leave/requests');
    if (sp.employee_id) {
      balances = await apiGet(`/v1/admin/hrm/leave/balances${balanceQs}`);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Leave"
        description="HRMP-A · yêu cầu phép · duyệt / từ chối · số dư"
        actions={<Badge tone="accent">HRM-Pro</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
          <p style={{ fontSize: 12, color: '#6b5559' }}>Cần FEATURE_HRM_PRO=true</p>
        </Panel>
      ) : null}

      <Panel title="Tạo yêu cầu phép">
        <form action={createLeaveRequest} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="employee_id" placeholder="employee_id" required style={{ padding: 8, minWidth: 160 }} />
          <select name="leave_type" defaultValue="annual" style={{ padding: 8 }}>
            <option value="annual">annual</option>
            <option value="unpaid">unpaid</option>
            <option value="sick">sick</option>
            <option value="remote">remote</option>
          </select>
          <input name="start_date" type="date" required style={{ padding: 8 }} />
          <input name="end_date" type="date" required style={{ padding: 8 }} />
          <input name="days" type="number" defaultValue={1} min={0.5} step={0.5} style={{ padding: 8, width: 80 }} />
          <Button type="submit">Gửi yêu cầu</Button>
        </form>
      </Panel>

      <Panel title="Số dư phép">
        <form method="get" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            name="employee_id"
            placeholder="employee_id để xem số dư"
            defaultValue={sp.employee_id || ''}
            style={{ padding: 8, minWidth: 200 }}
          />
          <button type="submit" style={{ padding: '8px 12px' }}>
            Xem số dư
          </button>
        </form>
        {!sp.employee_id ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Nhập employee_id để tra số dư</p>
        ) : balances.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Không có số dư / chưa khởi tạo</p>
        ) : (
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, margin: 0 }}>
            {balances.map((b) => (
              <li key={b.leave_type} style={{ marginBottom: 6 }}>
                <Badge tone="muted">{b.leave_type}</Badge> — {b.balance_days} ngày
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Yêu cầu (${rows.length})`}>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có yêu cầu</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid #eee',
                  fontSize: 13,
                }}
              >
                <span>
                  <Badge tone={r.status === 'approved' ? 'accent' : r.status === 'rejected' ? 'muted' : 'muted'}>
                    {r.status}
                  </Badge>{' '}
                  {r.leave_type} · emp {r.employee_id} · {r.days} ngày
                  <br />
                  <span style={{ color: '#6b5559', fontSize: 12 }}>
                    {r.start_date} → {r.end_date}
                  </span>
                </span>
                {r.status === 'pending' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <form action={approveLeave}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" size="sm">
                        Duyệt
                      </Button>
                    </form>
                    <form action={rejectLeave} style={{ display: 'flex', gap: 6 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input name="reason" placeholder="Lý do từ chối" style={{ padding: 6, fontSize: 12 }} />
                      <Button type="submit" variant="ghost" size="sm">
                        Từ chối
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
