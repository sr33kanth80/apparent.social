import { Skeleton } from 'apparent';

export function ProfileCard() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 24, maxWidth: 340 }}>
      <Skeleton style={{ height: 48, width: 48, borderRadius: 9999 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <Skeleton style={{ height: 14, width: '70%' }} />
        <Skeleton style={{ height: 12, width: '45%' }} />
      </div>
    </div>
  );
}

export function Lines() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 24, maxWidth: 340 }}>
      <Skeleton style={{ height: 120, width: '100%', borderRadius: 12 }} />
      <Skeleton style={{ height: 14, width: '90%' }} />
      <Skeleton style={{ height: 14, width: '60%' }} />
    </div>
  );
}
