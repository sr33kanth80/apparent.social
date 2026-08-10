import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { parse as parseYaml } from 'yaml';

const MAX_SKILL_BYTES = 80_000;
const MAX_RESOURCE_BYTES = 40_000;
const MAX_TOTAL_RESOURCE_BYTES = 120_000;
const MAX_RESOURCES = 12;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 12_000;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEXT_RESOURCE = /\.(?:md|mdx|txt|json|csv|ya?ml)$/i;

const compact = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export class AgentSkillSourceError extends Error {
  constructor(message, { status = 400, code = 'invalid_skill_source' } = {}) {
    super(message);
    this.name = 'AgentSkillSourceError';
    this.status = status;
    this.code = code;
  }
}

const isPrivateIpv4 = (address) => {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a >= 224;
};

export const isPrivateAgentSkillAddress = (address) => {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  if (isIP(address) !== 6) return true;
  const normalized = address.toLowerCase();
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? isPrivateIpv4(mapped) : false;
};

const validatePublicUrl = async (rawUrl) => {
  if (String(rawUrl || '').trim().length > 2_048) {
    throw new AgentSkillSourceError('The skill source URL is too long.');
  }
  let url;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch {
    throw new AgentSkillSourceError('Enter a valid public skill URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new AgentSkillSourceError('Skill sources must use a public http(s) URL without embedded credentials.');
  }
  if ((url.protocol === 'https:' && url.port && url.port !== '443') || (url.protocol === 'http:' && url.port && url.port !== '80')) {
    throw new AgentSkillSourceError('Skill sources may only use standard web ports.');
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new AgentSkillSourceError('Private network skill sources are not allowed.');
  }
  if (isIP(hostname)) {
    if (isPrivateAgentSkillAddress(hostname)) throw new AgentSkillSourceError('Private network skill sources are not allowed.');
    return url;
  }
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AgentSkillSourceError('The skill source host could not be resolved.', { status: 422 });
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAgentSkillAddress(address))) {
    throw new AgentSkillSourceError('Private network skill sources are not allowed.');
  }
  return url;
};

const githubCandidates = (rawUrl) => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return [rawUrl];
  }
  if (url.hostname.toLowerCase() === 'raw.githubusercontent.com') return [url.toString()];
  if (url.hostname.toLowerCase() !== 'github.com') {
    if (/\/(?:SKILL\.md)$/i.test(url.pathname)) return [url.toString()];
    url.pathname = `${url.pathname.replace(/\/$/, '')}/SKILL.md`;
    return [url.toString()];
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return [rawUrl];
  const [owner, repoWithGit, mode, branch, ...rest] = parts;
  const repo = repoWithGit.replace(/\.git$/i, '');
  if ((mode === 'blob' || mode === 'tree') && branch) {
    const path = rest.join('/');
    const skillPath = /SKILL\.md$/i.test(path) ? path : `${path.replace(/\/$/, '')}/SKILL.md`;
    return [`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${skillPath.replace(/^\//, '')}`];
  }
  return [
    `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`,
  ];
};

const readBoundedText = async (response, maxBytes) => {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new AgentSkillSourceError('The skill file is too large.', { status: 413 });
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new AgentSkillSourceError('The skill file is too large.', { status: 413 });
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new AgentSkillSourceError('The skill file is too large.', { status: 413 });
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
};

const fetchPublicText = async (rawUrl, maxBytes, redirects = 0) => {
  const url = await validatePublicUrl(rawUrl);
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'text/markdown,text/plain,application/json;q=0.8,*/*;q=0.2', 'User-Agent': 'Apparent-Agent-Skills/1.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AgentSkillSourceError(
      error?.name === 'TimeoutError' ? 'The skill source timed out.' : 'The skill source could not be reached.',
      { status: 422 },
    );
  }
  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) throw new AgentSkillSourceError('The skill source redirected too many times.', { status: 422 });
    const location = response.headers.get('location');
    if (!location) throw new AgentSkillSourceError('The skill source returned an invalid redirect.', { status: 422 });
    return fetchPublicText(new URL(location, url).toString(), maxBytes, redirects + 1);
  }
  if (!response.ok) {
    throw new AgentSkillSourceError(`The skill source returned HTTP ${response.status}.`, { status: 422 });
  }
  return { text: await readBoundedText(response, maxBytes), finalUrl: url.toString() };
};

export const parseAgentSkillDocument = (source) => {
  const match = String(source).match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) throw new AgentSkillSourceError('This is not a valid Agent Skill: SKILL.md needs YAML frontmatter.');
  let metadata;
  try {
    metadata = parseYaml(match[1]) || {};
  } catch {
    throw new AgentSkillSourceError('The SKILL.md frontmatter is not valid YAML.');
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new AgentSkillSourceError('The SKILL.md frontmatter must be a YAML object.');
  }
  const name = String(metadata.name || '').trim();
  const description = compact(metadata.description, 1_024);
  if (!SKILL_NAME.test(name) || name.length > 64) {
    throw new AgentSkillSourceError('The skill name must use lowercase letters, numbers, and hyphens only (maximum 64 characters).');
  }
  if (!description) throw new AgentSkillSourceError('The skill needs a description.');
  const instructions = String(match[2] || '').trim();
  if (!instructions) throw new AgentSkillSourceError('The skill has no instructions.');
  const rawAllowedTools = metadata['allowed-tools'];
  const allowedTools = (Array.isArray(rawAllowedTools) ? rawAllowedTools : String(rawAllowedTools || '').split(/\s+/))
    .map((value) => compact(value, 120))
    .filter(Boolean)
    .slice(0, 40);
  return { metadata, name, description, instructions, allowedTools };
};

const relativeResourcePaths = (source) => {
  const paths = new Set();
  const text = String(source || '');
  for (const match of text.matchAll(/\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    let path;
    try {
      path = decodeURIComponent(match[1].replace(/^<|>$/g, '').split('#')[0]);
    } catch {
      continue;
    }
    if (/^(?:references|assets|scripts)\//i.test(path)) paths.add(path);
  }
  for (const match of text.matchAll(/\b((?:references|assets|scripts)\/[A-Za-z0-9._/-]+)/g)) {
    paths.add(match[1].replace(/[),.;:]+$/, ''));
  }
  return [...paths].slice(0, MAX_RESOURCES * 2);
};

const loadResources = async (skillUrl, source) => {
  const resources = {};
  const base = new URL('.', skillUrl);
  let totalBytes = 0;
  let hasScripts = /(?:^|\W)scripts\//i.test(source);
  let hasReferences = /(?:^|\W)references\//i.test(source);
  let hasAssets = /(?:^|\W)assets\//i.test(source);
  for (const path of relativeResourcePaths(source)) {
    hasScripts ||= path.startsWith('scripts/');
    hasReferences ||= path.startsWith('references/');
    hasAssets ||= path.startsWith('assets/');
    if (/^scripts\//i.test(path) || !TEXT_RESOURCE.test(path) || Object.keys(resources).length >= MAX_RESOURCES) continue;
    const resourceUrl = new URL(path, base);
    if (resourceUrl.origin !== base.origin || !resourceUrl.pathname.startsWith(base.pathname)) continue;
    try {
      const loaded = await fetchPublicText(resourceUrl.toString(), MAX_RESOURCE_BYTES);
      const bytes = Buffer.byteLength(loaded.text, 'utf8');
      if (totalBytes + bytes > MAX_TOTAL_RESOURCE_BYTES) break;
      resources[path] = loaded.text;
      totalBytes += bytes;
    } catch {
      // A missing optional resource should not make an otherwise valid skill uninstallable.
    }
  }
  return { resources, hasScripts, hasReferences, hasAssets };
};

export const inspectAgentSkillSource = async (sourceUrl) => {
  let loaded;
  let lastError;
  for (const candidate of githubCandidates(String(sourceUrl || '').trim())) {
    try {
      loaded = await fetchPublicText(candidate, MAX_SKILL_BYTES);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!loaded) throw lastError || new AgentSkillSourceError('The skill source could not be read.', { status: 422 });
  const parsed = parseAgentSkillDocument(loaded.text);
  const resourceState = await loadResources(loaded.finalUrl, loaded.text);
  const hashInput = [loaded.text, ...Object.entries(resourceState.resources).sort(([a], [b]) => a.localeCompare(b)).flat()];
  const sourceHash = createHash('sha256').update(hashInput.join('\n')).digest('hex');
  const safeMetadata = {
    license: compact(parsed.metadata.license, 160),
    compatibility: compact(parsed.metadata.compatibility, 500),
    author: compact(parsed.metadata?.metadata?.author || parsed.metadata.author, 160),
  };
  return {
    name: parsed.name,
    description: parsed.description,
    instructions: parsed.instructions,
    sourceUrl: loaded.finalUrl,
    sourceHash,
    version: compact(parsed.metadata?.metadata?.version || parsed.metadata.version, 80),
    metadata: safeMetadata,
    allowedTools: parsed.allowedTools,
    resources: resourceState.resources,
    resourcePaths: Object.keys(resourceState.resources),
    hasScripts: resourceState.hasScripts,
    hasReferences: resourceState.hasReferences,
    hasAssets: resourceState.hasAssets,
  };
};
