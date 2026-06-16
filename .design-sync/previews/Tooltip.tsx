import { Tooltip, Button, Badge } from 'apparent';

export function OnButton() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 32, alignItems: 'center' }}>
      <Tooltip text="Checked against real build history">
        <Badge>Verified</Badge>
      </Tooltip>
      <Tooltip text="Matches your stated thesis" position="bottom">
        <Button variant="outline">94% fit</Button>
      </Tooltip>
    </div>
  );
}

export function Types() {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 32, alignItems: 'center' }}>
      <Tooltip text="Looks good" type="success"><Button variant="outline">Success</Button></Tooltip>
      <Tooltip text="Needs review" type="warning"><Button variant="outline">Warning</Button></Tooltip>
      <Tooltip text="Flagged" type="error"><Button variant="outline">Error</Button></Tooltip>
    </div>
  );
}
