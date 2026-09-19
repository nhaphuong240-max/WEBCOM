import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function checkAttendance(formData: FormData) {
  'use server';
  const employeeId = String(formData.get('employee_id') || '').trim();
  const eventType = String(formData.get('event_type') || 'check_in').trim();
  if (!employeeId) return;
  await apiJson('/v1/admin/hrm/attendance/check', 'POST', {
    employee_id: employeeId,
    event_type: eventType,
  });
  revalidatePath('/hrm/attendance');
}

async function buildTimesheet(formData: FormData) {
  'use server';
  const year = Number(formData.get('year') || 0);
  const month = Number(formData.get('month') || 0);
  if (!year || !month) return;
  await apiJson(`/v1/admin/hrm/timesheets/${year}/${month}/build`, 'POST', {});
  revalidatePath('/hrm/attendance');
}

async function lockTimesheet(formData: FormData) {
  'use server';
  const year = Number(formData.get('year') || 0);
  const month = Number(formData.get('month') || 0);
  if (!year || !month) return;
  await apiJson(`/v1/admin/hrm/timesheets/${year}/${month}/lock`, 'POST', {});
  revalidatePath('/hrm/attendance');
}

type AttendanceEvent = {
  id: string;
  employee_id: string;
  event_type: string;
  recorded_at: string;
};

type Timesheet = {
  year: number;
  month: number;
  status: string;
  locked_at: string | null;
};

export default async function HrmAttendancePage() {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  let events: AttendanceEvent[] = [];
  let timesheets: Timesheet[] = [];
  let error = '';
  try {
    events = await apiGet('/v1/admin/hrm/attendance/events?limit=50');
    timesheets = await apiGet('/v1/admin/hrm/timesheets');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description="HRMP-B · check-in/out · bảng công tháng build + lock"
        actions={<Badge tone="accent">HRM-Pro</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
          <p style={{ fontSize: 12, color: '#6b5559' }}>Cần FEATURE_HRM_PRO=true</p>
        </Panel>
      ) : null}

      <Panel title="Check-in / Check-out">
        <form action={checkAttendance} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="employee_id" placeholder="employee_id" required style={{ padding: 8, minWidth: 180 }} />
          <select name="event_type" defaultValue="check_in" style={{ padding: 8 }}>
            <option value="check_in">check_in</option>
            <option value="check_out">check_out</option>
          </select>
          <Button type="submit">Ghi nhận</Button>
        </form>
      </Panel>

      <Panel title="Bảng công tháng">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <form action={buildTimesheet} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input name="year" type="number" defaultValue={defaultYear} required style={{ padding: 8, width: 100 }} />
            <input name="month" type="number" defaultValue={defaultMonth} min={1} max={12} required style={{ padding: 8, width: 80 }} />
            <Button type="submit" variant="ghost">
              Build timesheet
            </Button>
          </form>
          <form action={lockTimesheet} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input name="year" type="number" defaultValue={defaultYear} required style={{ padding: 8, width: 100 }} />
            <input name="month" type="number" defaultValue={defaultMonth} min={1} max={12} required style={{ padding: 8, width: 80 }} />
            <Button type="submit">Lock timesheet</Button>
          </form>
        </div>
        {timesheets.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559', marginTop: 12 }}>Chưa có bảng công</p>
        ) : (
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, marginTop: 12 }}>
            {timesheets.map((t) => (
              <li key={`${t.year}-${t.month}`} style={{ marginBottom: 6 }}>
                <Badge tone={t.status === 'locked' ? 'accent' : 'muted'}>{t.status}</Badge> {t.year}/{t.month}
                {t.locked_at ? (
                  <span style={{ color: '#6b5559', fontSize: 12, marginLeft: 8 }}>locked {t.locked_at}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Sự kiện gần đây (${events.length})`}>
        {events.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có sự kiện chấm công</p>
        ) : (
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, margin: 0 }}>
            {events.map((e) => (
              <li key={e.id} style={{ marginBottom: 6 }}>
                <Badge tone="muted">{e.event_type}</Badge> emp {e.employee_id} · {e.recorded_at}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
