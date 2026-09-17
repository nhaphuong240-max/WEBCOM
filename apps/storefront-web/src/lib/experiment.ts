'use client';

import { useEffect, useState } from 'react';
import { STOREFRONT_ID, storeApi } from '../lib/api';
import { getSessionId, trackEvent } from '../lib/analytics';

type Variant = {
  key: string;
  headline?: string;
  cta?: string;
  cta_href?: string;
};

/** Assign A/B variant + fire experiment_exposed. */
export function useExperiment(code: string) {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [experimentId, setExperimentId] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionId();
    void storeApi<{ experiment_id: string | null; variant: Variant | null }>(
      `/v1/storefronts/${STOREFRONT_ID}/experiments/${code}/assign?session_id=${encodeURIComponent(session)}`,
      { cache: 'no-store' },
    )
      .then((res) => {
        if (res.experiment_id && res.variant) {
          setExperimentId(res.experiment_id);
          setVariant(res.variant);
          void trackEvent({
            name: 'experiment_exposed',
            experiment_id: res.experiment_id,
            variant_key: res.variant.key,
            payload: { code },
          });
        }
      })
      .catch(() => undefined);
  }, [code]);

  return { variant, experimentId };
}
