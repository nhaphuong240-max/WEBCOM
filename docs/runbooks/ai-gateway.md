# AI Gateway (A6)

## Components
| Piece | Role |
|---|---|
| `apps/ai-gateway` | FastAPI generate / RAG stub / budget |
| `admin-api` `AiModule` | Durable AiAction + ledger + approval/apply |
| Nest stub | Used when `AI_GATEWAY_URL` unset |

## Guardrails (enforced)
- `shopping_qa` → `risk=high` → `pending_approval` (100%)
- Apply without approval → 409
- Apply never publishes theme / changes price / issues refund
- Monthly cap `AI_TENANT_BUDGET_USD` (default 5)

## Run gateway
```bash
cd apps/ai-gateway && pip install -r requirements.txt
AI_GATEWAY_PORT=3104 python3 -m uvicorn app.main:app --app-dir . --port 3104
# admin-api: AI_GATEWAY_URL=http://127.0.0.1:3104
```

## Checks
`scripts/e2e-a6.sh` · `GET /v1/admin/ai/status`
