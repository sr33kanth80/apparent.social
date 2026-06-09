'use strict';

// File extension → language. Used to derive a language breakdown from tracked
// filenames WITHOUT reading any file contents.

const EXT_TO_LANG = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.mts': 'TypeScript', '.cts': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.py': 'Python', '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust', '.java': 'Java',
  '.kt': 'Kotlin', '.kts': 'Kotlin', '.swift': 'Swift', '.c': 'C', '.h': 'C',
  '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++', '.hpp': 'C++', '.cs': 'C#',
  '.php': 'PHP', '.scala': 'Scala', '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
  '.sql': 'SQL', '.html': 'HTML', '.htm': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
  '.sass': 'SCSS', '.less': 'CSS', '.vue': 'Vue', '.svelte': 'Svelte', '.ex': 'Elixir',
  '.exs': 'Elixir', '.dart': 'Dart', '.lua': 'Lua', '.r': 'R', '.m': 'Objective-C',
  '.mm': 'Objective-C', '.sol': 'Solidity', '.clj': 'Clojure', '.hs': 'Haskell',
  '.erl': 'Erlang', '.zig': 'Zig', '.nim': 'Nim', '.pl': 'Perl', '.jl': 'Julia',
};

// Excluded from the language % so the flex reflects real coding, not config/docs.
const NON_CODE = new Set(['JSON', 'YAML', 'Markdown', 'TOML', 'Docker', 'Text']);

const EXT_TO_NONCODE = {
  '.json': 'JSON', '.yml': 'YAML', '.yaml': 'YAML', '.md': 'Markdown',
  '.toml': 'TOML', '.txt': 'Text',
};

const langForPath = (path) => {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = path.slice(dot).toLowerCase();
  return EXT_TO_LANG[ext] || EXT_TO_NONCODE[ext] || null;
};

/** Tracked file paths → ranked [{ name, percent }] over code languages only. */
const rankLanguages = (paths) => {
  const counts = {};
  for (const p of paths) {
    const lang = langForPath(p);
    if (!lang || NON_CODE.has(lang)) continue;
    counts[lang] = (counts[lang] || 0) + 1;
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  if (!total) return [];
  return Object.entries(counts)
    .map(([name, n]) => ({ name, percent: Math.round((n / total) * 100) }))
    .sort((a, b) => b.percent - a.percent);
};

module.exports = { rankLanguages, langForPath };
