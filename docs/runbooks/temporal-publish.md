# Temporal publish / go-live (A4)

## Workflows
| Name | Trigger |
|---|---|
| `GoLiveValidationWorkflow` | `POST …/golive/evaluate` |
| `PublishThemeWorkflow` | `POST …/publish` |

Steps: validate_checklist → backup_current → publish_atomic → revalidate → health_window → audit_notify.

## Engine
- Default: `temporal_stub` in admin-api (`FEATURE_TEMPORAL=true`)
- Live cluster: set `TEMPORAL_ADDRESS` (+ optional `@ptt/worker` with `@temporalio/worker`)
- Disable: `FEATURE_TEMPORAL=false` → legacy in-process

## Failure drill
1. Checklist fail → publish returns 409 `blocked` + `job_id` / `workflow_id`
2. Fix or waive → publish again
3. `POST …/rollback` — expect `within_slo=true` (`duration_ms` < 300000)
4. See also `docs/runbooks/publish-fail.md`

## Worker
```bash
pnpm --filter @ptt/worker start
# companion stub unless TEMPORAL_ADDRESS set
```
