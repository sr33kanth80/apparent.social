import { InfiniteSlider, Badge } from 'apparent';

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  height: 40, padding: '0 20px', borderRadius: 9999, border: '1px solid #e4ded4',
  background: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
};

export function LogoMarquee() {
  const names = ['KUCOIN', 'NextGen', 'Motor Labs', 'DEXTOOLS', 'Polychain', 'Fundamental'];
  return (
    <div style={{ padding: 24 }}>
      <InfiniteSlider gap={20} speed={40}>
        {names.map((n) => (<div key={n} style={chip}>{n}</div>))}
      </InfiniteSlider>
    </div>
  );
}

export function BadgeMarquee() {
  const tags = ['B2B SaaS', 'AI Infra', 'Fintech', 'Dev Tools', 'Climate', 'Healthtech'];
  return (
    <div style={{ padding: 24 }}>
      <InfiniteSlider gap={12} speed={30}>
        {tags.map((t) => (<Badge key={t} variant="secondary">{t}</Badge>))}
      </InfiniteSlider>
    </div>
  );
}
