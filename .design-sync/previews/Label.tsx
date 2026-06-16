import { Label, Input } from 'apparent';

export function WithInput() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 24, maxWidth: 320 }}>
      <Label htmlFor="fund">Fund name</Label>
      <Input id="fund" placeholder="Thesis Ventures" />
    </div>
  );
}

export function Standalone() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 24 }}>
      <Label>Investment stage</Label>
      <Label>Check size</Label>
      <Label>Geography</Label>
    </div>
  );
}
