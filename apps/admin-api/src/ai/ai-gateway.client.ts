import { Injectable, Logger } from '@nestjs/common';

export type AiKind = 'theme_match_explain' | 'headline_variants' | 'shopping_qa';

export type GatewayGenerateResult = {
  request_id: string;
  kind: AiKind;
  risk: 'low' | 'high';
  status_hint: 'draft' | 'pending_approval';
  output: Record<string, unknown>;
  model: string;
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  guardrails: string[];
  rag_hits: Array<{ id: string; score: number; text: string }>;
  latency_ms: number;
  engine: 'fastapi' | 'nest_stub';
};

function featureAi() {
  const v = process.env.FEATURE_AI_GATEWAY;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

@Injectable()
export class AiGatewayClient {
  private readonly log = new Logger(AiGatewayClient.name);

  enabled() {
    return featureAi();
  }

  status() {
    return {
      enabled: this.enabled(),
      url: process.env.AI_GATEWAY_URL ? '[set]' : null,
      mode: process.env.AI_GATEWAY_URL?.trim() ? 'fastapi' : 'nest_stub',
      budget_cap_usd: Number(process.env.AI_TENANT_BUDGET_USD || 5),
      model: process.env.AI_MODEL || 'stub-llm-v1',
    };
  }

  async generate(input: {
    tenantId: string;
    kind: AiKind;
    payload: Record<string, unknown>;
    storefrontId?: string;
    actorId?: string;
  }): Promise<GatewayGenerateResult> {
    const url = process.env.AI_GATEWAY_URL?.trim();
    if (url) {
      try {
        const res = await fetch(`${url.replace(/\/$/, '')}/v1/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.AI_GATEWAY_KEY
              ? { 'x-ai-gateway-key': process.env.AI_GATEWAY_KEY }
              : {}),
          },
          body: JSON.stringify({
            tenant_id: input.tenantId,
            kind: input.kind,
            payload: input.payload,
            storefront_id: input.storefrontId,
            actor_id: input.actorId,
          }),
          signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(8000) : undefined,
        });
        if (res.status === 402) {
          const body = await res.json().catch(() => ({}));
          const err = new Error('AI_BUDGET_EXCEEDED') as Error & { details?: unknown };
          err.details = body;
          throw err;
        }
        if (!res.ok) {
          throw new Error(`AI gateway ${res.status}`);
        }
        const data = (await res.json()) as Omit<GatewayGenerateResult, 'engine'>;
        return { ...data, engine: 'fastapi' };
      } catch (e) {
        if (e instanceof Error && e.message === 'AI_BUDGET_EXCEEDED') throw e;
        this.log.warn(`AI gateway soft-fail → nest stub: ${e}`);
      }
    }
    return this.stubGenerate(input);
  }

  private stubGenerate(input: {
    tenantId: string;
    kind: AiKind;
    payload: Record<string, unknown>;
  }): GatewayGenerateResult {
    const risk: 'low' | 'high' = input.kind === 'shopping_qa' ? 'high' : 'low';
    const cost =
      input.kind === 'shopping_qa' ? 0.004 : input.kind === 'headline_variants' ? 0.0015 : 0.002;
    let output: Record<string, unknown>;
    let guardrails: string[];
    let rag_hits: GatewayGenerateResult['rag_hits'] = [];

    if (input.kind === 'theme_match_explain') {
      const industry = String(input.payload.industry || 'beauty');
      const goal = String(input.payload.goal || 'conversion');
      output = {
        explanation: `Theme Match (${industry}/${goal}): ưu tiên playbook conversion. Merchant tự install.`,
        top_code: 'tpl_aura_glow',
        guardrail: 'Không auto-install — merchant xác nhận trong Marketplace.',
        policy: { auto_publish: false, price_mutation: false, refund_mutation: false },
      };
      guardrails = ['no_auto_install', 'no_auto_publish', 'audit_required'];
    } else if (input.kind === 'headline_variants') {
      const base = String(input.payload.headline || 'Serum tái tạo da đêm');
      output = {
        variants: [base, `${base} — kết quả sau 7 đêm`, `Khám phá ${base.toLowerCase()}`, `Ưu đãi: ${base}`],
        guardrail: 'Draft only — không auto-publish vào Builder.',
        policy: { auto_publish: false, price_mutation: false, refund_mutation: false },
      };
      guardrails = ['draft_only', 'no_auto_publish', 'no_price_change'];
    } else {
      const question = String(input.payload.question || '');
      rag_hits = [
        {
          id: 'kb_policy',
          score: 1,
          text: 'Đổi trả 7 ngày còn tem. AI không cam kết refund/giá.',
        },
      ];
      output = {
        answer_draft: `Nháp cho «${question}». ${rag_hits[0].text} Chờ approval — không đổi giá/refund.`,
        guardrail: 'High-risk: cần approval trước khi apply. Không commit giá/refund.',
        forbidden_tools: ['publish_theme', 'update_price', 'issue_refund'],
        policy: { auto_publish: false, price_mutation: false, refund_mutation: false },
      };
      guardrails = [
        'high_risk_approval_required',
        'no_auto_publish',
        'no_price_change',
        'no_refund',
        'rag_acl',
      ];
    }

    return {
      request_id: `aig_stub_${Date.now().toString(36)}`,
      kind: input.kind,
      risk,
      status_hint: risk === 'high' ? 'pending_approval' : 'draft',
      output,
      model: process.env.AI_MODEL || 'stub-llm-v1',
      cost_usd: cost,
      prompt_tokens: 100,
      completion_tokens: 80,
      guardrails,
      rag_hits,
      latency_ms: 1,
      engine: 'nest_stub',
    };
  }
}
