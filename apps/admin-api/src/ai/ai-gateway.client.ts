import { Injectable, Logger } from '@nestjs/common';

export type AiKind =
  | 'theme_match_explain'
  | 'headline_variants'
  | 'shopping_qa'
  | 'social_reply'
  | 'care_reply'
  | 'nba_suggest';

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

function isHighRisk(kind: AiKind) {
  return (
    kind === 'shopping_qa' ||
    kind === 'social_reply' ||
    kind === 'care_reply' ||
    kind === 'nba_suggest'
  );
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
      kinds: [
        'theme_match_explain',
        'headline_variants',
        'shopping_qa',
        'social_reply',
        'care_reply',
        'nba_suggest',
      ],
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
    const risk: 'low' | 'high' = isHighRisk(input.kind) ? 'high' : 'low';
    const cost =
      input.kind === 'shopping_qa'
        ? 0.004
        : input.kind === 'social_reply' || input.kind === 'care_reply'
          ? 0.0035
          : input.kind === 'nba_suggest'
            ? 0.003
            : input.kind === 'headline_variants'
              ? 0.0015
              : 0.002;
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
    } else if (input.kind === 'social_reply') {
      const inbound = String(input.payload.inbound_preview || input.payload.message || '');
      const contact = String(input.payload.contact_name || 'bạn');
      const upsell = String(input.payload.upsell_sku_code || 'AURA-GLOW-30');
      rag_hits = [
        {
          id: 'kb_social',
          score: 1,
          text: 'AI reply cần human approval trước khi gửi kênh. Không cam kết giá/refund.',
        },
      ];
      const draft = `Chào ${contact}! Cảm ơn tin nhắn «${inbound.slice(0, 80)}». Em gửi thêm gợi ý ${upsell} — shop sẽ xác nhận chi tiết. (Nháp AI — chờ duyệt)`;
      output = {
        reply_draft: draft,
        answer_draft: draft,
        upsell_sku_code: upsell,
        intent: String(input.payload.intent || 'general'),
        handoff_suggested: false,
        guardrail: 'High-risk social reply: approval trước khi gửi. Không tự commit giá/refund.',
        forbidden_tools: ['send_without_approval', 'update_price', 'issue_refund'],
        policy: {
          auto_publish: false,
          price_mutation: false,
          refund_mutation: false,
          auto_send: false,
        },
      };
      guardrails = [
        'high_risk_approval_required',
        'no_auto_send',
        'no_price_change',
        'no_refund',
        'human_handoff_available',
      ];
    } else if (input.kind === 'care_reply') {
      const name = String(input.payload.customer_name || 'bạn');
      const subject = String(input.payload.subject || 'yêu cầu hỗ trợ');
      rag_hits = [
        {
          id: 'kb_care',
          score: 1,
          text: 'Care reply cần approval. Không cam kết refund/giá. Draft only trên ticket.',
        },
      ];
      const draft = `Chào ${name}, shop đã nhận «${subject.slice(0, 60)}». Em xin lỗi vì trải nghiệm chưa tốt — team sẽ hỗ trợ sớm. (Nháp care AI — chờ duyệt, không tự gửi)`;
      output = {
        reply_draft: draft,
        answer_draft: draft,
        tone: String(input.payload.tone || 'empathetic'),
        guardrail: 'High-risk care_reply: approval rồi lưu draft — không auto-send / refund.',
        forbidden_tools: ['send_without_approval', 'issue_refund', 'update_price'],
        policy: {
          auto_publish: false,
          price_mutation: false,
          refund_mutation: false,
          auto_send: false,
        },
      };
      guardrails = [
        'high_risk_approval_required',
        'no_auto_send',
        'no_refund',
        'draft_on_ticket_only',
      ];
    } else if (input.kind === 'nba_suggest') {
      const playbook = String(input.payload.playbook || 'manual');
      rag_hits = [
        {
          id: 'kb_nba',
          score: 1,
          text: 'NBA suggestions require approval before materialize. No auto-refund.',
        },
      ];
      const suggestions =
        playbook === 'delay_cod'
          ? [
              {
                action: 'call',
                reason: 'AI: COD delay — call to confirm',
                expected_outcome: 'Reduce cancel',
                estimated_cost: 5000,
              },
              {
                action: 'reminder',
                reason: 'AI: soft reminder first',
                expected_outcome: 'Response',
                estimated_cost: 500,
              },
            ]
          : playbook === 'fail_payment'
            ? [
                {
                  action: 'voucher',
                  reason: 'AI: recovery voucher stub',
                  expected_outcome: 'Retry pay',
                  estimated_cost: 20000,
                },
                {
                  action: 'care',
                  reason: 'AI: care message',
                  expected_outcome: 'Recover',
                  estimated_cost: 0,
                },
              ]
            : [
                {
                  action: 'care',
                  reason: 'AI: generic care',
                  expected_outcome: 'CSAT',
                  estimated_cost: 0,
                },
                {
                  action: 'no_contact',
                  reason: 'AI: avoid over-contact if resolved',
                  expected_outcome: 'No spam',
                  estimated_cost: 0,
                },
              ];
      output = {
        suggestions,
        playbook,
        guardrail: 'High-risk nba_suggest: approve rồi mới tạo NBA rows. Không auto-refund/send.',
        forbidden_tools: ['issue_refund', 'auto_send', 'mass_broadcast'],
        policy: {
          auto_publish: false,
          price_mutation: false,
          refund_mutation: false,
          auto_send: false,
        },
      };
      guardrails = [
        'high_risk_approval_required',
        'no_auto_send',
        'no_refund',
        'materialize_after_approve',
      ];
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
