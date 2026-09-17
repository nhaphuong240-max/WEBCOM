# AI Gateway (A6)

FastAPI service for Theme Match explain, headline variants, shopping Q&A (Qdrant stub).

```bash
cd apps/ai-gateway
python3 -m pip install -r requirements.txt
pnpm start   # or: python3 -m uvicorn app.main:app --app-dir . --port 3104
```

Env: `AI_TENANT_BUDGET_USD`, `AI_GATEWAY_KEY`, `AI_MODEL`, `AI_GATEWAY_PORT`.

Admin-api calls via `AI_GATEWAY_URL` (fallback: Nest in-process stub).
