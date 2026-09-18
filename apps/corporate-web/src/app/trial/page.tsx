import { Suspense } from 'react';
import TrialPage from './TrialClient';

export default function TrialRoute() {
  return (
    <Suspense
      fallback={
        <main className="corp-page">
          <p style={{ color: 'var(--ink-3)' }}>Đang tải…</p>
        </main>
      }
    >
      <TrialPage />
    </Suspense>
  );
}
