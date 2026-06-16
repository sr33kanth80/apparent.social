import { Separator } from 'apparent';

export function Horizontal() {
  return (
    <div style={{ padding: 24, maxWidth: 320 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Thesis Ventures</div>
      <div style={{ fontSize: 13, color: '#6b665f' }}>Pre-seed · B2B AI</div>
      <Separator style={{ margin: '14px 0' }} />
      <div style={{ fontSize: 13, color: '#6b665f' }}>34 verified matches this week</div>
    </div>
  );
}

export function Vertical() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 24, height: 40 }}>
      <span style={{ fontSize: 14 }}>Founders</span>
      <Separator orientation="vertical" />
      <span style={{ fontSize: 14 }}>Investors</span>
      <Separator orientation="vertical" />
      <span style={{ fontSize: 14 }}>About</span>
    </div>
  );
}
