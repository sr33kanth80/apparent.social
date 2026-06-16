import { Textarea, Label } from 'apparent';

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, padding: 24, maxWidth: 380 };

export function Default() {
  return (
    <div style={wrap}>
      <Textarea placeholder="Tell us what you're building…" />
    </div>
  );
}

export function WithLabel() {
  return (
    <div style={wrap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Label htmlFor="pitch">Founder note</Label>
        <Textarea
          id="pitch"
          defaultValue={'We ship agentic data pipelines. 1,200 commits this quarter, $22k MRR, growing 18% MoM.'}
        />
      </div>
    </div>
  );
}
