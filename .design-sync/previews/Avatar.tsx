import { Avatar, AvatarImage, AvatarFallback } from 'apparent';

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, padding: 24 };

export function Fallbacks() {
  return (
    <div style={row}>
      <Avatar>
        <AvatarImage src="https://i.pravatar.cc/80?img=12" alt="Mara Lin" />
        <AvatarFallback>ML</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: '#dcefc7', color: '#20300a' }}>AK</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: '#42520d', color: '#f4f1eb' }}>JR</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: '#cfdaf5', color: '#1a2a52' }}>SV</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <Avatar style={{ height: 32, width: 32 }}>
        <AvatarFallback style={{ background: '#dcefc7', color: '#20300a', fontSize: 12 }}>S</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: '#dcefc7', color: '#20300a' }}>M</AvatarFallback>
      </Avatar>
      <Avatar style={{ height: 56, width: 56 }}>
        <AvatarFallback style={{ background: '#dcefc7', color: '#20300a', fontSize: 18 }}>L</AvatarFallback>
      </Avatar>
    </div>
  );
}
