import { PageHeader, Panel, Badge } from '@ptt/ui';

export default function PlaceholderPage({
  title,
  mockup,
  note,
}: {
  title: string;
  mockup: string;
  note: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={`Placeholder W0 — UI production bắt đầu W2/W3. Baseline: mockup ${mockup}.`}
        actions={<Badge tone="accent">W0</Badge>}
      />
      <Panel title="Scope">
        <p style={{ fontSize: 14, color: 'var(--ptt-ink-3)' }}>{note}</p>
      </Panel>
    </>
  );
}
