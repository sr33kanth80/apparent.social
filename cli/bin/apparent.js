#!/usr/bin/env node
/*
 * apparent — placeholder v0.0.1 (name-claim release).
 *
 * This exists only to reserve the `apparent` npm name and give early runners a
 * friendly message. The real v1 (local-git build card → founder profile) is
 * specified in cli/BLUEPRINT.md. Keep this dependency-free.
 */

'use strict';

const G = '\x1b[38;5;106m'; // apparent green-ish
const D = '\x1b[2m';
const B = '\x1b[1m';
const R = '\x1b[0m';

const lines = [
  '',
  `${G}   █████╗ ██████╗ ██████╗  █████╗ ██████╗ ███████╗███╗   ██╗████████╗${R}`,
  `${G}  ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║╚══██╔══╝${R}`,
  `${G}  ███████║██████╔╝██████╔╝███████║██████╔╝█████╗  ██╔██╗ ██║   ██║   ${R}`,
  `${G}  ██╔══██║██╔═══╝ ██╔═══╝ ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║   ██║   ${R}`,
  `${G}  ██║  ██║██║     ██║     ██║  ██║██║  ██║███████╗██║ ╚████║   ██║   ${R}`,
  `${G}  ╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ${R}`,
  '',
  `  ${B}Make your real work apparent to the investors who fund builders.${R}`,
  '',
  `  ${D}Coming soon:${R} run this in a repo (or your workspace) and apparent`,
  `  ${D}turns your build activity into a brag-worthy card + a founder profile.${R}`,
  `  ${D}Your code never leaves your machine — only the stats you approve.${R}`,
  '',
  `  ${B}→ https://apparent.social${R}`,
  '',
];

process.stdout.write(lines.join('\n') + '\n');
