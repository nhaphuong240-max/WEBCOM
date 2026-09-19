import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function openShift(formData: FormData) {
  'use server';
  const registerId = String(formData.get('register_id') || '').trim();
  const openingCash = Number(formData.get('opening_cash') || 0);
  if (!registerId) return;
  await apiJson('/v1/admin/hr/shifts/open', 'POST', {
    register_id: registerId,
    opening_cash: openingCash,
  });
  revalidatePath('/hr/shifts');
}

async function closeShift(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const closingCash = Number(formData.get('closing_cash') || 0);
  if (!id) return;
  await apiJson(`/v1/admin/hr/shifts/${id}/close`, 'POST', {
    closing_cash: closingCash,
  });
  revalidatePath('/hr/shifts');
}

type Loc = {
  id: string;
  name: string;
  registers: Array<{ id: string; code: string; name: string }>;
};

type Shift = {
  id: string;
  status: string;
  location_name: string;
  register_code: string;
  register_id: string;
  opening_cash: number;
  closing_cash: number | null;
  opened_at: string;
  closed_at: string | null;
};

export default async function HrShiftsPage() {
  let locations: Loc[] = [];
  let shifts: Shift[] = [];
  let error = '';
  try {
    locations = await apiGet('/v1/admin/hr/pos-locations');
    shifts = await apiGet('/v1/admin/hr/shifts');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const registers = locations.flatMap((l) =>
    (l.registers || []).map((r) => ({ ...r, location_name: l.name })),
  );

  return (
    <>
      <PageHeader
        title="Shifts"
        description="HR-2 · mở / đóng ca POS (PosShift)"
        actions={<Badge tone="accent">HR-2</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
          <p style={{ fontSize: 12, color: '#6b5559' }}>
            Cần FEATURE_HR_SHIFT=true và quyền pos.shift.manage
          </p>
        </Panel>
      ) : null}
      <Panel title="Mở ca">
        <form action={openShift} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select name="register_id" style={{ padding: 8, minWidth: 200 }}>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.location_name} / {r.code}
              </option>
            ))}
          </select>
          <input
            name="opening_cash"
            type="number"
            defaultValue={0}
            placeholder="Opening cash"
            style={{ padding: 8, width: 120 }}
          />
          <Button type="submit">Open shift</Button>
        </form>
      </Panel>
      <Panel title="Lịch sử ca">
        {shifts.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có ca</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {shifts.map((s) => (
              <li
                key={s.id}
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
                  <Badge tone={s.status === 'open' ? 'accent' : 'muted'}>{s.status}</Badge>{' '}
                  {s.location_name} / {s.register_code} · open {s.opening_cash}
                  <br />
                  <span style={{ color: '#6b5559', fontSize: 12 }}>{s.opened_at}</span>
                </span>
                {s.status === 'open' ? (
                  <form action={closeShift} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      name="closing_cash"
                      type="number"
                      defaultValue={s.opening_cash}
                      style={{ padding: 6, width: 100 }}
                    />
                    <Button type="submit" variant="ghost">
                      Close
                    </Button>
                  </form>
                ) : (
                  <span style={{ color: '#6b5559' }}>closed {s.closing_cash ?? '—'}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
