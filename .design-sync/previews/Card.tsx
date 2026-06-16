import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge,
} from 'apparent';

export function Default() {
  return (
    <div style={{ padding: 24, maxWidth: 380 }}>
      <Card>
        <CardHeader>
          <CardTitle>Verified dealflow</CardTitle>
          <CardDescription>
            Every founder checked against real build history and traction before the first call.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            Apparent matches your thesis to founders whose proof of work — code, shipping cadence,
            revenue — already clears the bar.
          </p>
        </CardContent>
        <CardFooter style={{ gap: 8 }}>
          <Button>View matches</Button>
          <Button variant="outline">Save thesis</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function FounderProfile() {
  return (
    <div style={{ padding: 24, maxWidth: 380 }}>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle style={{ fontSize: 18 }}>Acme AI</CardTitle>
            <Badge variant="secondary">Seed</Badge>
          </div>
          <CardDescription>Agentic data infrastructure · 2 founders</CardDescription>
        </CardHeader>
        <CardContent style={{ display: 'flex', gap: 12 }}>
          <Badge variant="outline">$22k MRR</Badge>
          <Badge variant="outline">1.2k commits</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
