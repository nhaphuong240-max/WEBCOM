import PlaceholderPage from '@/components/PlaceholderPage';
import { Button, Badge, Kpi, Panel, Input, PttMark } from '@ptt/ui';

export default function DesignSystemPage() {
  return (
    <>
      <PlaceholderPage
        title="Design system"
        mockup="ptt-design.css"
        note="Components từ @ptt/ui — port token mockup W0 (Storybook full có thể thêm sau)."
      />
      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <Panel title="Brand">
          <PttMark label="PTT Commerce" />
        </Panel>
        <Panel title="Buttons">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="ink">Ink</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </Panel>
        <Panel title="Badges">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="signal">Pass</Badge>
            <Badge tone="accent">Publish</Badge>
            <Badge tone="warn">Staging</Badge>
            <Badge tone="danger">Fail</Badge>
            <Badge tone="muted">Draft</Badge>
          </div>
        </Panel>
        <Panel title="KPI">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Kpi label="Contribution margin" value="32.4%" delta="↑ 2.1đ" emphasis />
            <Kpi label="Net revenue" value="₫1.84 tỷ" />
          </div>
        </Panel>
        <Panel title="Input">
          <Input placeholder="Tenant slug" />
        </Panel>
      </div>
    </>
  );
}
