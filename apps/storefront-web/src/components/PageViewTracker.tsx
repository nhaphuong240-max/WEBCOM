'use client';

import { useEffect } from 'react';
import { trackEvent } from '../lib/analytics';

export function PageViewTracker({ path }: { path?: string }) {
  useEffect(() => {
    void trackEvent({
      name: 'page_view',
      landing_path: path || window.location.pathname,
    });
  }, [path]);
  return null;
}
