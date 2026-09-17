'use client';

import { STOREFRONT_ID, storeApi } from '../lib/api';

const CONSENT_KEY = 'ptt_consent_v1';
const SESSION_KEY = 'ptt_session_v1';

export function getConsentState(): 'granted' | 'denied' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === 'granted' || v === 'denied') return v;
  return 'unknown';
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `ses_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type TrackInput = {
  name: string;
  payload?: Record<string, unknown>;
  landing_path?: string;
  experiment_id?: string;
  variant_key?: string;
  /** Transactional events (purchase) bypass consent denial */
  force?: boolean;
};

/** First-party Event SDK — consent-gated marketing events (W4). */
export async function trackEvent(input: TrackInput) {
  const consent = getConsentState();
  if (!input.force && consent === 'denied') return { skipped: true };

  return storeApi('/v1/events', {
    method: 'POST',
    cache: 'no-store',
    body: JSON.stringify({
      storefront_id: STOREFRONT_ID,
      name: input.name,
      session_id: getSessionId(),
      landing_path: input.landing_path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      consent_state: consent,
      experiment_id: input.experiment_id,
      variant_key: input.variant_key,
      payload: input.payload || {},
    }),
  }).catch(() => undefined);
}
