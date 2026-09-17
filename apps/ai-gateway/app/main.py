"""
WebCom A6 — AI Gateway (FastAPI)
Theme Match explain · headline variants · shopping Q&A (RAG stub)
Guardrails: no auto-publish, no price/refund mutations; high-risk → pending_approval upstream.
"""
from __future__ import annotations

import os
import time
import uuid
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="WebCom AI Gateway", version="1.0.0", docs_url="/docs")

Kind = Literal["theme_match_explain", "headline_variants", "shopping_qa"]

# In-process budget ledger: tenant_id -> spent USD (month key ignored for stub simplicity)
_BUDGET: dict[str, float] = {}
_DEFAULT_CAP = float(os.getenv("AI_TENANT_BUDGET_USD", "5.0"))
_COST = {
    "theme_match_explain": 0.002,
    "headline_variants": 0.0015,
    "shopping_qa": 0.004,
}

# Qdrant-stub knowledge (tenant-scoped ACL by filtering tenant_id==* or matching)
_KNOWLEDGE = [
    {
        "id": "kb1",
        "tenant_id": "*",
        "text": "Đổi trả trong 7 ngày với sản phẩm còn tem. Không hoàn tiền COD đã giao thành công trừ lỗi nhà bán.",
        "tags": ["refund", "return", "policy"],
    },
    {
        "id": "kb2",
        "tenant_id": "*",
        "text": "Serum Glow dùng buổi tối sau làm sạch. Tránh mắt. Patch test 24h.",
        "tags": ["product", "serum", "usage"],
    },
    {
        "id": "kb3",
        "tenant_id": "*",
        "text": "AI không được tự publish theme hoặc đổi giá SKU — chỉ draft + approval.",
        "tags": ["guardrail", "policy"],
    },
]


class GenerateRequest(BaseModel):
    tenant_id: str
    kind: Kind
    payload: dict[str, Any] = Field(default_factory=dict)
    storefront_id: str | None = None
    actor_id: str | None = None


class GenerateResponse(BaseModel):
    request_id: str
    kind: Kind
    risk: Literal["low", "high"]
    status_hint: Literal["draft", "pending_approval"]
    output: dict[str, Any]
    model: str
    cost_usd: float
    prompt_tokens: int
    completion_tokens: int
    guardrails: list[str]
    rag_hits: list[dict[str, Any]] = Field(default_factory=list)
    latency_ms: int


def _rag(tenant_id: str, query: str, limit: int = 3) -> list[dict[str, Any]]:
    q = (query or "").lower()
    hits = []
    for doc in _KNOWLEDGE:
        if doc["tenant_id"] not in ("*", tenant_id):
            continue
        score = sum(1 for t in doc["tags"] if t in q) + (2 if any(w in doc["text"].lower() for w in q.split() if len(w) > 3) else 0)
        if score > 0 or not q:
            hits.append({**doc, "score": float(score or 0.1)})
    hits.sort(key=lambda h: h["score"], reverse=True)
    return hits[:limit]


def _charge(tenant_id: str, amount: float) -> float:
    cap = float(os.getenv(f"AI_BUDGET_{tenant_id}", os.getenv("AI_TENANT_BUDGET_USD", str(_DEFAULT_CAP))))
    spent = _BUDGET.get(tenant_id, 0.0)
    if spent + amount > cap:
        raise HTTPException(
            status_code=402,
            detail={"code": "AI_BUDGET_EXCEEDED", "spent_usd": spent, "cap_usd": cap, "need_usd": amount},
        )
    _BUDGET[tenant_id] = round(spent + amount, 6)
    return _BUDGET[tenant_id]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-gateway",
        "wave": "A6",
        "qdrant": "stub",
        "model": os.getenv("AI_MODEL", "stub-llm-v1"),
        "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/v1/budget/{tenant_id}")
def budget(tenant_id: str):
    cap = float(os.getenv(f"AI_BUDGET_{tenant_id}", os.getenv("AI_TENANT_BUDGET_USD", str(_DEFAULT_CAP))))
    spent = _BUDGET.get(tenant_id, 0.0)
    return {
        "tenant_id": tenant_id,
        "spent_usd": spent,
        "cap_usd": cap,
        "remaining_usd": round(max(0.0, cap - spent), 6),
    }


@app.post("/v1/rag/query")
def rag_query(body: dict[str, Any]):
    tenant_id = str(body.get("tenant_id") or "")
    query = str(body.get("query") or "")
    if not tenant_id:
        raise HTTPException(400, "tenant_id required")
    return {"hits": _rag(tenant_id, query), "engine": "qdrant_stub"}


@app.post("/v1/generate", response_model=GenerateResponse)
def generate(
    req: GenerateRequest,
    x_ai_key: str | None = Header(default=None, alias="x-ai-gateway-key"),
):
    expected = os.getenv("AI_GATEWAY_KEY", "").strip()
    if expected and x_ai_key != expected:
        raise HTTPException(401, "Invalid AI gateway key")

    t0 = time.time()
    cost = _COST[req.kind]
    spent_after = _charge(req.tenant_id, cost)
    risk: Literal["low", "high"] = "high" if req.kind == "shopping_qa" else "low"
    status_hint: Literal["draft", "pending_approval"] = "pending_approval" if risk == "high" else "draft"
    rag_hits: list[dict[str, Any]] = []
    model = os.getenv("AI_MODEL", "stub-llm-v1")

    if req.kind == "theme_match_explain":
        industry = str(req.payload.get("industry") or "beauty")
        goal = str(req.payload.get("goal") or "conversion")
        output = {
            "explanation": (
                f"Theme Match ({industry}/{goal}): ưu tiên playbook conversion, "
                f"mobile CVR, SEO sẵn. Merchant tự install — gateway không auto-install."
            ),
            "top_code": "tpl_aura_glow",
            "guardrail": "Không auto-install — merchant xác nhận trong Marketplace.",
        }
        guardrails = ["no_auto_install", "no_auto_publish", "audit_required"]
        prompt_tokens, completion_tokens = 120, 80
    elif req.kind == "headline_variants":
        base = str(req.payload.get("headline") or "Serum tái tạo da đêm")
        output = {
            "variants": [
                base,
                f"{base} — kết quả sau 7 đêm",
                f"Khám phá {base.lower()}",
                f"Ưu đãi: {base}",
            ],
            "guardrail": "Draft only — không auto-publish vào Builder.",
        }
        guardrails = ["draft_only", "no_auto_publish", "no_price_change"]
        prompt_tokens, completion_tokens = 90, 100
    else:
        question = str(req.payload.get("question") or "")
        rag_hits = _rag(req.tenant_id, question)
        context = " | ".join(h["text"] for h in rag_hits) or "Không có FAQ khớp."
        output = {
            "answer_draft": (
                f"Nháp trả lời cho: «{question}». "
                f"Dựa trên knowledge: {context} "
                "Không cam kết giá/refund — chờ approval."
            ),
            "guardrail": "High-risk: cần approval trước khi apply. Không commit giá/refund.",
            "forbidden_tools": ["publish_theme", "update_price", "issue_refund"],
        }
        guardrails = [
            "high_risk_approval_required",
            "no_auto_publish",
            "no_price_change",
            "no_refund",
            "rag_acl",
        ]
        prompt_tokens, completion_tokens = 200, 140

    output["budget_spent_usd"] = spent_after
    output["policy"] = {
        "auto_publish": False,
        "price_mutation": False,
        "refund_mutation": False,
    }

    return GenerateResponse(
        request_id=f"aig_{uuid.uuid4().hex[:12]}",
        kind=req.kind,
        risk=risk,
        status_hint=status_hint,
        output=output,
        model=model,
        cost_usd=cost,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        guardrails=guardrails,
        rag_hits=[{"id": h["id"], "score": h["score"], "text": h["text"]} for h in rag_hits],
        latency_ms=int((time.time() - t0) * 1000),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("AI_GATEWAY_PORT", "3104")),
        reload=False,
    )
