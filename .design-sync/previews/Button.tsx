import { Button, GitHubIcon } from 'apparent';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 24 };

export function Variants() {
  return (
    <div style={row}>
      <Button>Get verified</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Remove</Button>
      <Button variant="link">Learn more</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="GitHub"><GitHubIcon style={{ width: 16, height: 16 }} /></Button>
    </div>
  );
}

export function WithIcon() {
  return (
    <div style={row}>
      <Button><GitHubIcon style={{ width: 16, height: 16, marginRight: 8 }} />Connect GitHub</Button>
      <Button variant="outline"><GitHubIcon style={{ width: 16, height: 16, marginRight: 8 }} />View repo</Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={row}>
      <Button disabled>Disabled</Button>
      <Button variant="outline" disabled>Disabled</Button>
    </div>
  );
}
