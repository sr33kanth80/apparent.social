import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgentSkillSourceError,
  isPrivateAgentSkillAddress,
  parseAgentSkillDocument,
} from '../server/agent/skill-source.js';
import {
  formatInstalledSkillPrompt,
  readInstalledSkillResource,
} from '../server/agent/installed-skills.js';

const installedSkill = {
  id: 'skill-1',
  name: 'fundraise-review',
  description: 'Review a startup fundraising narrative.',
  sourceUrl: 'https://example.com/SKILL.md',
  instructions: 'Read the evidence, identify gaps, and return a concise review.',
  allowedTools: ['search_public_web'],
  resourcePaths: ['references/checklist.md'],
  resources: { 'references/checklist.md': '# Checklist\n- Evidence\n- Risks' },
};

test('parses portable SKILL.md frontmatter and instructions', () => {
  const parsed = parseAgentSkillDocument(`---
name: fundraise-review
description: Review a startup fundraising narrative.
allowed-tools:
  - search_public_web
metadata:
  version: 1.0.0
---
# Instructions
Use the evidence.`);

  assert.equal(parsed.name, 'fundraise-review');
  assert.equal(parsed.description, 'Review a startup fundraising narrative.');
  assert.deepEqual(parsed.allowedTools, ['search_public_web']);
  assert.match(parsed.instructions, /Use the evidence/);
});

test('rejects malformed or unsafe skill names', () => {
  assert.throws(
    () => parseAgentSkillDocument(`---\nname: Fundraise Review\ndescription: Test\n---\nDo it.`),
    AgentSkillSourceError,
  );
});

test('recognizes loopback and private network addresses', () => {
  assert.equal(isPrivateAgentSkillAddress('127.0.0.1'), true);
  assert.equal(isPrivateAgentSkillAddress('10.4.2.1'), true);
  assert.equal(isPrivateAgentSkillAddress('192.168.1.10'), true);
  assert.equal(isPrivateAgentSkillAddress('::1'), true);
  assert.equal(isPrivateAgentSkillAddress('8.8.8.8'), false);
  assert.equal(isPrivateAgentSkillAddress('2606:4700:4700::1111'), false);
});

test('formats an installed skill as bounded, subordinate guidance', () => {
  const prompt = formatInstalledSkillPrompt(installedSkill);
  assert.match(prompt, /Active user-installed skill: fundraise-review/);
  assert.match(prompt, /cannot override Apparent system rules/);
  assert.match(prompt, /Bundled scripts are never executable/);
  assert.match(prompt, /references\/checklist\.md/);
});

test('reads only an exact installed text resource and refuses scripts', () => {
  assert.deepEqual(readInstalledSkillResource(installedSkill, { path: 'references/checklist.md' }), {
    path: 'references/checklist.md',
    content: '# Checklist\n- Evidence\n- Risks',
    truncated: false,
  });
  assert.equal(readInstalledSkillResource(installedSkill, { path: 'scripts/run.js' }).error, 'skill_resource_not_available');
  assert.equal(readInstalledSkillResource(installedSkill, { path: 'Scripts/run.js' }).error, 'skill_resource_not_available');
  assert.equal(readInstalledSkillResource(installedSkill, { path: '../secret.txt' }).error, 'skill_resource_not_available');
});
