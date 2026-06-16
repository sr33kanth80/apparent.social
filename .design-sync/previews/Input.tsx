import { Input, Label } from 'apparent';

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: 24, maxWidth: 340 };

export function Default() {
  return (
    <div style={wrap}>
      <Input placeholder="founder@startup.com" />
      <Input defaultValue="acme-ai" />
      <Input type="search" placeholder="Search founders…" />
    </div>
  );
}

export function WithLabel() {
  return (
    <div style={wrap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" placeholder="you@fund.vc" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Label htmlFor="thesis">Investment thesis</Label>
        <Input id="thesis" placeholder="Pre-seed B2B AI in North America" />
      </div>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={wrap}>
      <Input disabled placeholder="Disabled" />
      <Input disabled defaultValue="Locked value" />
    </div>
  );
}
