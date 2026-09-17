# DR restore drill (W5)

## RPO / RTO mục tiêu (Standard)
- RPO: ≤ 24h (daily PG dump)
- RTO: ≤ 4h storefront restore

## Drill checklist
1. Snapshot Postgres `webecom` + `.env` secrets vault
2. Restore vào staging DB
3. `prisma migrate deploy` + `db seed` (non-prod only)
4. Restart systemd units; smoke `/api/health` + home 200
5. Ghi thời gian thực tế vào ops log

## Không làm trên prod khi drill
- Không `seed` ghi đè catalog live trừ khi freeze window
