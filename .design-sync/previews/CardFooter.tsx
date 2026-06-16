import { Card, CardHeader, CardTitle, CardFooter, Button } from 'apparent';

export function Default() {
  return (
    <div style={{ padding: 24, maxWidth: 360 }}>
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: 18 }}>Thesis match</CardTitle>
        </CardHeader>
        <CardFooter style={{ gap: 8 }}>
          <Button>View matches</Button>
          <Button variant="outline">Dismiss</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
