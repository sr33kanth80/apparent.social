// Token-at-rest encryption for GitHub OAuth tokens.
//
// Derives a 32-byte AES-256 key from GITHUB_OAUTH_SECRET via scrypt with a
// fixed application salt, then uses AES-256-GCM with a random 12-byte IV per
// token. The output is base64url(iv).base64url(ciphertext).base64url(tag) —
// three dot-separated chunks the DB stores as a single text column.
//
// Lives outside /api so Vercel does not deploy it as a standalone function.

import crypto from 'crypto';

const APP_SALT = Buffer.from('apparent-gh-token-v1');

const base64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64url = (s) =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const deriveKey = (secret) => crypto.scryptSync(secret, APP_SALT, 32);

export const encryptToken = (token, secret) => {
  if (!token || !secret) return '';
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64url(iv)}.${base64url(ciphertext)}.${base64url(tag)}`;
};

export const decryptToken = (encoded, secret) => {
  if (!encoded || !secret) return '';
  try {
    const [ivPart, ctPart, tagPart] = encoded.split('.');
    if (!ivPart || !ctPart || !tagPart) return '';
    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, fromBase64url(ivPart));
    decipher.setAuthTag(fromBase64url(tagPart));
    const plaintext = Buffer.concat([
      decipher.update(fromBase64url(ctPart)),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    return '';
  }
};
