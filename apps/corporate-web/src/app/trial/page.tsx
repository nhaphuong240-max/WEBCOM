import { Suspense } from 'react';
import TrialPage from './TrialClient';

export default function TrialRoute() {
  return (
    <Suspense fallback={<main style={{ padding: 48 }}>Đang tải…</main>}>
      <TrialPage />
    </Suspense>
  );
}
