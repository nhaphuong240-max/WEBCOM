import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export const HRM_PAYROLL_TAX_DISCLAIMER =
  'Công thức BHXH/PIT chỉ mang tính ước tính; merchant chịu trách nhiệm cấu hình rate và tuân thủ pháp luật. WebCom không thay thế tư vấn thuế.';

async function setSalary(formData: FormData) {
  'use server';
  const employeeId = String(formData.get('employee_id') || '').trim();
  const baseSalary = Number(formData.get('base_salary') || 0);
  if (!employeeId || !baseSalary) return;
  await apiJson(`/v1/admin/hrm/salary/${employeeId}`, 'PUT', { base_salary: baseSalary });
  revalidatePath('/hrm/payroll');
}

async function runPayroll(formData: FormData) {
  'use server';
  const year = Number(formData.get('year') || 0);
  const month = Number(formData.get('month') || 0);
  if (!year || !month) return;
  await apiJson(`/v1/admin/hrm/payroll/${year}/${month}/run`, 'POST', {});
  revalidatePath('/hrm/payroll');
}

async function approvePayrollRun(formData: FormData) {
  'use server';
  const runId = String(formData.get('run_id') || '').trim();
  if (!runId) return;
  await apiJson(`/v1/admin/hrm/payroll/runs/${runId}/transition`, 'POST', { status: 'approved' });
  revalidatePath('/hrm/payroll');
}

type PayrollRun = {
  id: string;
  year: number;
  month: number;
  status: string;
  tax_disclaimer?: string;
};

type Payslip = {
  id: string;
  employee_id: string;
  gross_salary: number;
  net_salary: number;
  deductions: number;
  tax_disclaimer?: string;
};

export default async function HrmPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ run_id?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  let runs: PayrollRun[] = [];
  let payslips: Payslip[] = [];
  let error = '';
  try {
    runs = await apiGet('/v1/admin/hrm/payroll/runs');
    if (sp.run_id) {
      payslips = await apiGet(`/v1/admin/hrm/payroll/runs/${sp.run_id}/payslips`);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Payroll VN"
        description="HRMP-C · lương · kỳ lương draft→approved · payslip"
        actions={<Badge tone="accent">HRM-Pro</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
          <p style={{ fontSize: 12, color: '#6b5559' }}>Cần FEATURE_HRM_PRO=true</p>
        </Panel>
      ) : null}

      <Panel title="Disclaimer thuế / BHXH">
        <p
          data-testid="hrm-tax-disclaimer"
          style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: '#6b5559' }}
        >
          {HRM_PAYROLL_TAX_DISCLAIMER}
        </p>
      </Panel>

      <Panel title="Thiết lập lương cơ bản">
        <form action={setSalary} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="employee_id" placeholder="employee_id" required style={{ padding: 8, minWidth: 180 }} />
          <input
            name="base_salary"
            type="number"
            placeholder="base_salary (VND)"
            defaultValue={15000000}
            required
            style={{ padding: 8, width: 160 }}
          />
          <Button type="submit">Lưu lương</Button>
        </form>
      </Panel>

      <Panel title="Chạy kỳ lương">
        <form action={runPayroll} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input name="year" type="number" defaultValue={defaultYear} required style={{ padding: 8, width: 100 }} />
          <input name="month" type="number" defaultValue={defaultMonth} min={1} max={12} required style={{ padding: 8, width: 80 }} />
          <Button type="submit">Run payroll (draft)</Button>
        </form>
      </Panel>

      <Panel title={`Kỳ lương (${runs.length})`}>
        {runs.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có kỳ lương</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {runs.map((r) => (
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
                  <Badge tone={r.status === 'approved' ? 'accent' : 'muted'}>{r.status}</Badge> {r.year}/{r.month}
                  {r.tax_disclaimer ? (
                    <p style={{ fontSize: 11, color: '#6b5559', margin: '4px 0 0' }}>{r.tax_disclaimer}</p>
                  ) : null}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <a href={`/hrm/payroll?run_id=${r.id}`} style={{ fontSize: 12, color: 'var(--ptt-accent)' }}>
                    Payslips
                  </a>
                  {r.status === 'draft' ? (
                    <form action={approvePayrollRun}>
                      <input type="hidden" name="run_id" value={r.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Approve
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {sp.run_id ? (
        <Panel title={`Payslips — run ${sp.run_id}`}>
          {payslips.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b5559' }}>Không có payslip</p>
          ) : (
            <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, margin: 0 }}>
              {payslips.map((p) => (
                <li key={p.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                  emp {p.employee_id} · gross {p.gross_salary.toLocaleString('vi-VN')} · net{' '}
                  <strong>{p.net_salary.toLocaleString('vi-VN')}</strong> VND
                  {p.tax_disclaimer ? (
                    <p style={{ fontSize: 11, color: '#6b5559', margin: '4px 0 0' }}>{p.tax_disclaimer}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p style={{ fontSize: 12, color: '#6b5559', marginTop: 12, marginBottom: 0 }}>{HRM_PAYROLL_TAX_DISCLAIMER}</p>
        </Panel>
      ) : null}
    </>
  );
}
