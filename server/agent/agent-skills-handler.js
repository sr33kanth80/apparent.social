import { requireAgentAccess, sendAgentAccessError } from './agent-guard.js';
import {
  agentSkillStorageConfigured,
  deleteInstalledAgentSkill,
  installAgentSkill,
  listInstalledAgentSkills,
  updateInstalledAgentSkill,
} from './installed-skills.js';
import { AgentSkillSourceError, inspectAgentSkillSource } from './skill-source.js';

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const roleFrom = (req, body) => {
  const role = String(body?.role || req.query?.role || '').trim().toLowerCase();
  return role === 'founder' || role === 'investor' ? role : '';
};

const preview = (skill) => ({
  name: skill.name,
  description: skill.description,
  sourceUrl: skill.sourceUrl,
  sourceHash: skill.sourceHash,
  version: skill.version,
  metadata: skill.metadata,
  allowedTools: skill.allowedTools,
  resourcePaths: skill.resourcePaths,
  hasScripts: skill.hasScripts,
  hasReferences: skill.hasReferences,
  hasAssets: skill.hasAssets,
});

export default async function agentSkillsHandler(req, res) {
  const body = req.method === 'POST' || req.method === 'PATCH' ? await readJsonBody(req) : {};
  const role = roleFrom(req, body);
  if (!role) return res.status(400).json({ error: 'Choose the founder or investor Agent Skill library.' });

  const access = await requireAgentAccess(req, role, 'agent-skills');
  if (!access.ok) return sendAgentAccessError(res, access);
  if (!agentSkillStorageConfigured()) {
    return res.status(503).json({ error: 'Agent Skill persistence is not configured on the server.' });
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ skills: await listInstalledAgentSkills(access.userId, role) });
    }

    if (req.method === 'POST') {
      const action = String(body.action || 'inspect');
      if (action === 'inspect') {
        const inspected = await inspectAgentSkillSource(body.sourceUrl);
        return res.status(200).json({ preview: preview(inspected) });
      }
      if (action === 'install') {
        // Re-fetch on install so a client cannot substitute different instructions
        // after the preview. The stored checksum pins exactly what was installed.
        const inspected = await inspectAgentSkillSource(body.sourceUrl);
        const skill = await installAgentSkill(access.userId, role, inspected);
        return res.status(201).json({ skill });
      }
      return res.status(400).json({ error: 'Unsupported Agent Skill action.' });
    }

    if (req.method === 'PATCH') {
      const id = String(body.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Choose a skill to update.' });
      const skill = await updateInstalledAgentSkill(access.userId, role, id, {
        activationMode: body.activationMode,
        enabled: body.enabled,
      });
      if (!skill) return res.status(404).json({ error: 'That Agent Skill is not installed.' });
      return res.status(200).json({ skill });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Choose a skill to uninstall.' });
      await deleteInstalledAgentSkill(access.userId, role, id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof AgentSkillSourceError) {
      return res.status(error.status || 400).json({ error: error.message, code: error.code });
    }
    const status = Number(error?.status);
    return res.status(Number.isFinite(status) && status >= 400 && status < 600 ? status : 500).json({
      error: String(error?.message || 'The Agent Skill request failed.'),
    });
  }
}
