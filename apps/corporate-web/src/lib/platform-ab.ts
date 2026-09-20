'use client';

import { useEffect, useState } from 'react';

export type PlatformAbVariant = {
  key: string;
  weight?: number;
  headline?: string;
  cta?: string;
  cta_href?: string;
};

export type PlatformExperimentPayload = {
  code: string;
  status?: string;
  variants?: PlatformAbVariant[];
};

const API =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '')) ||
  '';

function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const k = 'ptt_platform_ab_sid';
  let id = sessionStorage.getItem(k);
  if (!id) {
    id = `psid_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(k, id);
  }
  return id;
}

function pickWeighted(variants: PlatformAbVariant[]): PlatformAbVariant | null {
  if (!variants.length) return null;
  const total = variants.reduce((s, v) => s + (Number(v.weight) || 1), 0);
  let r = Math.random() * total;
  for (const v of variants) {
    r -= Number(v.weight) || 1;
    if (r <= 0) return v;
  }
  return variants[variants.length - 1] || null;
}

/**
 * PC3-6 — sticky A/B for Platform CMS hero.
 * Prefers assign API on interim SF; falls back to client weighted pick from public payload.
 */
export function usePlatformAb(
  code: string | null | undefined,
  experiment: PlatformExperimentPayload | null | undefined,
  storefrontId: string | null | undefined,
): PlatformAbVariant | null {
  const [variant, setVariant] = useState<PlatformAbVariant | null>(null);

  useEffect(() => {
    const trimmed = code?.trim();
    if (!trimmed || !experiment?.variants?.length) return;

    const cacheKey = `ptt_platform_ab_${trimmed}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as PlatformAbVariant;
        if (parsed?.key) {
          setVariant(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    const apply = (v: PlatformAbVariant | null) => {
      if (!v) return;
      setVariant(v);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(v));
      } catch {
        /* ignore */
      }
      const w = window as Window & { dataLayer?: unknown[]; __pttConsent?: string };
      if (w.__pttConsent !== 'denied') {
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({
          event: 'experiment_exposed',
          experiment_code: trimmed,
          variant_key: v.key,
        });
      }
    };

    const sf = storefrontId?.trim();
    if (API && sf) {
      const sid = sessionId();
      void fetch(
        `${API}/api/v1/storefronts/${encodeURIComponent(sf)}/experiments/${encodeURIComponent(trimmed)}/assign?session_id=${encodeURIComponent(sid)}`,
        { cache: 'no-store' },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((res: { variant?: PlatformAbVariant | null } | null) => {
          if (res?.variant?.key) apply(res.variant);
          else apply(pickWeighted(experiment.variants || []));
        })
        .catch(() => apply(pickWeighted(experiment.variants || [])));
      return;
    }

    apply(pickWeighted(experiment.variants));
  }, [code, experiment, storefrontId]);

  return variant;
}
