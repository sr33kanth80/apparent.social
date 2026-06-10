import uploadDelete from '../server/upload-delete.js';
import uploadPresign from '../server/upload-presign.js';

export default async function handler(req, res) {
  const route = String((req.query && req.query.route) || '').trim();
  if (route === 'presign') return uploadPresign(req, res);
  if (route === 'delete') return uploadDelete(req, res);
  return res.status(404).json({ error: 'unknown upload route' });
}
