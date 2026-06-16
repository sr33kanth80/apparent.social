import { Card, CardHeader, CardTitle, CardContent, Badge } from 'apparent';

export function Default() {
  return (
    <div style={{ padding: 24, maxWidth: 360 }}>
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: 18 }}>Acme AI</CardTitle>
        </CardHeader>
        <CardContent style={{ display: 'flex', gap: 8 }}>
          <Badge variant="outline">$22k MRR</Badge>
          <Badge variant="outline">1.2k commits</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
