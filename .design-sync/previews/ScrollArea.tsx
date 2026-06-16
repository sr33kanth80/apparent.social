import { ScrollArea, Separator } from 'apparent';

const founders = [
  ['Acme AI', 'Agentic data infra · $22k MRR'],
  ['Northwind', 'Dev tools · 1.2k commits'],
  ['Lumen Labs', 'Vertical AI · pre-seed'],
  ['Quartz', 'Fintech · $40k MRR'],
  ['Foundry', 'Robotics · seed'],
  ['Cadence', 'Healthtech · pre-seed'],
  ['Vela', 'Climate · seed'],
  ['Orbit', 'Marketplace · $11k MRR'],
];

export function FounderList() {
  return (
    <div style={{ padding: 24 }}>
      <ScrollArea style={{ height: 220, width: 300, borderRadius: 12, border: '1px solid #e4ded4' }}>
        <div style={{ padding: 12 }}>
          {founders.map(([name, meta], i) => (
            <div key={name}>
              <div style={{ padding: '8px 6px' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 12, color: '#6b665f' }}>{meta}</div>
              </div>
              {i < founders.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
