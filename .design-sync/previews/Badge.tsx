import { Badge } from 'apparent';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 24 };

export function Variants() {
  return (
    <div style={row}>
      <Badge>Verified</Badge>
      <Badge variant="secondary">Seed</Badge>
      <Badge variant="outline">Pre-seed</Badge>
      <Badge variant="destructive">Flagged</Badge>
    </div>
  );
}

export function Statuses() {
  return (
    <div style={row}>
      <Badge variant="secondary">Thesis match 94%</Badge>
      <Badge variant="outline">B2B SaaS</Badge>
      <Badge>Proof of work</Badge>
    </div>
  );
}
