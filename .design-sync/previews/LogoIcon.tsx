import { LogoIcon } from 'apparent';

// LogoIcon only forwards `className` to its <svg>, so size it via a scoped
// stylesheet that targets the svg inside each wrapper.
export function Default() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 28, color: '#111' }}>
      <style>{`
        .lg-sm svg { width: 28px; height: 28px; }
        .lg-md svg { width: 44px; height: 44px; }
        .lg-olive svg { width: 44px; height: 44px; color: #42520d; }
        .lg-word svg { width: 28px; height: 28px; }
      `}</style>
      <span className="lg-sm"><LogoIcon /></span>
      <span className="lg-md"><LogoIcon /></span>
      <span className="lg-olive"><LogoIcon /></span>
      <span className="lg-word" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoIcon />
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Apparent</span>
      </span>
    </div>
  );
}
