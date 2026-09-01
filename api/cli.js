// npx apparent — CLI endpoints, merged behind ?route= .
//
// Two logical endpoints share one serverless function because the Vercel Hobby
// plan caps the project at 12. vercel.json rewrites preserve the original public
// paths (/api/cli-ingest, /api/cli-investors) that shipped CLI versions call, so
// this merge is invisible to clients.

import ingestHandler from '../server/cli-ingest-handler.js';
import investorsHandler from '../server/cli-investors-handler.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || '').trim();
  if (route === 'ingest') return ingestHandler(req, res);
  if (route === 'investors') return investorsHandler(req, res);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).json({ ok: false, error: 'unknown_route' });
}
