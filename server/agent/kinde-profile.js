import { bindKindeRole, verifyKindeRequest } from './agent-guard.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const identity = await verifyKindeRequest(req);
  if (!identity.ok) return res.status(identity.status || 401).json({ error: identity.error });

  const requestedRole = req.body?.role;
  const role = await bindKindeRole(identity, requestedRole);
  if (!role) {
    return res.status(503).json({ error: 'Unable to finish Apparent account setup.' });
  }

  return res.status(200).json({ role });
}
