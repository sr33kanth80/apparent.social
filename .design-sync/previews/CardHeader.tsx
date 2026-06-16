import { Card, CardHeader, CardTitle, CardDescription } from 'apparent';

export function Default() {
  return (
    <div style={{ padding: 24, maxWidth: 360 }}>
      <Card>
        <CardHeader>
          <CardTitle>Verified dealflow</CardTitle>
          <CardDescription>Founders checked before the first call.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
