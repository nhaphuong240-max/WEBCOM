import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

export type SocialProvider = 'meta' | 'zalo';

export type StubInbound = {
  external_thread_id: string;
  external_message_id: string;
  contact_name: string;
  contact_handle: string;
  body: string;
  author_name: string;
  payload: Record<string, unknown>;
};

function featureSocialLive() {
  const v = process.env.FEATURE_SOCIAL_LIVE;
  if (v === undefined || v === '') return false;
  return v === '1' || v.toLowerCase() === 'true';
}

/**
 * Meta / Zalo connector stubs (B1). Live OAuth optional via FEATURE_SOCIAL_LIVE.
 */
@Injectable()
export class SocialConnectors {
  mode(provider: SocialProvider): 'stub' | 'live' {
    if (!featureSocialLive()) return 'stub';
    if (provider === 'meta' && process.env.META_APP_ID) return 'live';
    if (provider === 'zalo' && process.env.ZALO_APP_ID) return 'live';
    return 'stub';
  }

  status() {
    return {
      feature_social_live: featureSocialLive(),
      connectors: {
        meta: {
          mode: this.mode('meta'),
          channel_types: ['fanpage', 'messenger', 'ig'],
        },
        zalo: {
          mode: this.mode('zalo'),
          channel_types: ['oa'],
        },
      },
      sla_default_minutes: Number(process.env.SOCIAL_SLA_MINUTES || 15),
    };
  }

  /** Simulate OAuth bind — returns stub credentials (hashed token only). */
  bindStub(input: {
    provider: SocialProvider;
    channel_type: string;
    external_id?: string;
    display_name?: string;
  }) {
    const externalId =
      input.external_id ||
      `${input.provider}_${input.channel_type}_${randomBytes(4).toString('hex')}`;
    const rawToken = `stub_${randomBytes(16).toString('hex')}`;
    const tokenHash = createHash('sha256').update(rawToken).digest('hex').slice(0, 24);
    const displayName =
      input.display_name ||
      (input.provider === 'meta'
        ? `Meta ${input.channel_type} staging`
        : `Zalo OA staging`);
    return {
      external_id: externalId,
      display_name: displayName,
      credentials: {
        mode: 'stub',
        token_fingerprint: tokenHash,
        bound_at: new Date().toISOString(),
      },
      metadata: {
        sandbox: true,
        provider: input.provider,
        channel_type: input.channel_type,
      },
    };
  }

  /** Normalize webhook / simulate payload into inbound message shape. */
  parseInbound(provider: SocialProvider, body: Record<string, unknown>): StubInbound {
    const kind = String(body.kind || body.message_kind || 'chat');
    const thread =
      String(body.thread_id || body.external_thread_id || body.psid || body.user_id || '') ||
      `thr_${randomBytes(6).toString('hex')}`;
    const msgId =
      String(body.message_id || body.external_message_id || body.mid || '') ||
      `msg_${randomBytes(6).toString('hex')}`;
    const text = String(body.text || body.body || body.message || body.comment || 'Xin chào (stub)');
    const name = String(body.contact_name || body.from_name || 'Khách social');
    const handle = String(body.contact_handle || body.from_id || thread);
    return {
      external_thread_id: thread,
      external_message_id: msgId,
      contact_name: name,
      contact_handle: handle,
      body: text,
      author_name: name,
      payload: {
        provider,
        message_kind: kind === 'comment' ? 'comment' : 'chat',
        post_id: body.post_id || body.postId || null,
        reel_id: body.reel_id || body.reelId || null,
        raw: body,
        ingested_at: new Date().toISOString(),
      },
    };
  }

  /** Stub send reply to channel — no external call. */
  async sendReply(
    provider: SocialProvider,
    _channelExternalId: string,
    _body: string,
  ): Promise<{ external_message_id: string; mode: string }> {
    return {
      external_message_id: `${provider}_out_${randomBytes(6).toString('hex')}`,
      mode: this.mode(provider),
    };
  }
}
