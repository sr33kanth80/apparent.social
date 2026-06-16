import { Switch } from 'apparent';

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18, padding: 24, alignItems: 'flex-start' };

export function Segmented() {
  return (
    <div style={wrap}>
      <Switch defaultValue="founders">
        <Switch.Control value="founders" label="Founders" />
        <Switch.Control value="investors" label="Investors" />
      </Switch>
      <Switch defaultValue="month">
        <Switch.Control value="week" label="Week" />
        <Switch.Control value="month" label="Month" />
        <Switch.Control value="all" label="All time" />
      </Switch>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={wrap}>
      <Switch size="small" defaultValue="list">
        <Switch.Control value="list" label="List" />
        <Switch.Control value="map" label="Map" />
      </Switch>
      <Switch size="large" defaultValue="match">
        <Switch.Control value="match" label="Best match" />
        <Switch.Control value="recent" label="Recent" />
      </Switch>
    </div>
  );
}
