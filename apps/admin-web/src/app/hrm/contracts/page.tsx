import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function createContract(formData: FormData) {
  'use server';
  const employeeId = String(formData.get('employee_id') || '').trim();
  const contractType = String(formData.get('contract_type') || 'indefinite').trim();
  const startDate = String(formData.get('start_date') || '').trim();
  const baseSalary = Number(formData.get('base_salary') || 0);
  if (!employeeId || !startDate || !baseSalary) return;
  await apiJson('/v1/admin/hrm/contracts', 'POST', {
    employee_id: employeeId,
    contract_type: contractType,
    start_date: startDate,
    base_salary: baseSalary,
  });
  revalidatePath('/hrm/contracts');
}

type Contract = {
  id: string;
  employee_id: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  base_salary: number;
  status: string;
};

export default async function HrmContractsPage() {
  let rows: Contract[] = [];
  let error = '';
  try {
    rows = await apiGet('/v1/admin/hrm/contracts');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Employment contracts"
        description="HRMP-A · HĐLĐ gắn employee_id"
        actions={<Badge tone="accent">HRM-Pro</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
          <p style={{ fontSize: 12, color: '#6b5559' }}>Cần FEATURE_HRM_PRO=true</p>
        </Panel>
      ) : null}
      <Panel title="Tạo hợp đồng">
        <form action={createContract} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="employee_id" placeholder="employee_id" required style={{ padding: 8, minWidth: 180 }} />
          <select name="contract_type" defaultValue="indefinite" style={{ padding: 8 }}>
            <option value="probation">probation</option>
            <option value="fixed">fixed</option>
            <option value="indefinite">indefinite</option>
          </select>
          <input name="start_date" type="date" required style={{ padding: 8 }} />
          <input
            name="base_salary"
            type="number"
            placeholder="base_salary (VND)"
            defaultValue={15000000}
            required
            style={{ padding: 8, width: 160 }}
          />
          <Button type="submit">Tạo HĐ</Button>
        </form>
      </Panel>
      <Panel title={`Hợp đồng (${rows.length})`}>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có hợp đồng</p>
        ) : (
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map((c) => (
              <li key={c.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                <Badge tone="muted">{c.status}</Badge>{' '}
                <span style={{ fontWeight: 600 }}>{c.contract_type}</span> · emp {c.employee_id}
                <br />
                <span style={{ color: '#6b5559', fontSize: 12 }}>
                  {c.start_date}
                  {c.end_date ? ` → ${c.end_date}` : ''} · {c.base_salary.toLocaleString('vi-VN')} VND
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
