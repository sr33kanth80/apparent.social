import { GitHubIcon } from 'apparent';

export function Default() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 28, color: '#111' }}>
      <GitHubIcon style={{ width: 20, height: 20 }} />
      <GitHubIcon style={{ width: 32, height: 32 }} />
      <GitHubIcon style={{ width: 48, height: 48 }} />
      <GitHubIcon style={{ width: 32, height: 32, color: '#42520d' }} />
    </div>
  );
}
