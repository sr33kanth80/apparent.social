import { VerifiedAvatar } from 'apparent';

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 18, padding: 24 };

export function Verified() {
  return (
    <div style={row}>
      <VerifiedAvatar name="Mara Lin" verified />
      <VerifiedAvatar name="Arjun Kapoor" bg="#cfdaf5" verified />
      <VerifiedAvatar name="Jess Romero" bg="#ff9473" verified />
    </div>
  );
}

export function Unverified() {
  return (
    <div style={row}>
      <VerifiedAvatar name="Sam Vale" />
      <VerifiedAvatar name="Priya N" bg="#a7fccd" />
      <VerifiedAvatar name="Dev Okoro" bg="#cfdaf5" />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <VerifiedAvatar name="Feed User" size="feed" verified />
      <VerifiedAvatar name="Small One" size="sm" verified />
      <VerifiedAvatar name="Medium Two" size="md" verified />
    </div>
  );
}
