#!/usr/bin/env node
/**
 * Claude Session Memory — Conversation Logger
 *
 * Manages persistent conversation logs across Claude Code projects.
 * Stores human-readable markdown summaries organized by project and date.
 *
 * Usage:
 *   node conversation-logger.cjs save --project "my-app" --summary "..." [--topics "..."] [--files "..."]
 *   node conversation-logger.cjs search --query "auth" [--project "my-app"] [--limit 10]
 *   node conversation-logger.cjs list [--project "my-app"] [--limit 20]
 *   node conversation-logger.cjs recent [--days 7] [--project "my-app"]
 *   node conversation-logger.cjs deep-search --query "auth" [--limit 5]
 *   node conversation-logger.cjs read --project "my-app" --file "2026-03-20_xxx.md"
 *
 * Part of: claude-session-memory
 * License: MIT
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOGS_DIR = path.join(os.homedir(), '.claude', 'conversation-logs');
const INDEX_FILE = path.join(LOGS_DIR, 'index.json');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Index management ────────────────────────────────────────────────────────

function loadIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    try { return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')); }
    catch (e) { return { sessions: [], version: 1 }; }
  }
  return { sessions: [], version: 1 };
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

function projectNameFromPath(p) {
  if (!p) return 'general';
  return path.basename(p).replace(/[^a-zA-Z0-9_-]/g, '-');
}

// ── Save ────────────────────────────────────────────────────────────────────

function saveConversation(opts) {
  const now = new Date();
  const projectName = opts.project || projectNameFromPath(process.cwd());
  const projectDir = path.join(LOGS_DIR, projectName);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const sessionId = `${now.toISOString().slice(0, 10)}_${Date.now()}`;
  const fileName = `${sessionId}.md`;
  const filePath = path.join(projectDir, fileName);

  const split = (v) => v ? v.split(',').map(s => s.trim()) : [];
  const topics = split(opts.topics);
  const files = split(opts.files);
  const decisions = split(opts.decisions);
  const nextSteps = split(opts.nextSteps);

  const lines = [
    '---',
    `id: ${sessionId}`,
    `date: ${now.toISOString()}`,
    `project: ${projectName}`,
    `projectPath: ${opts.projectPath || process.cwd()}`,
    topics.length ? `topics: [${topics.map(t => `"${t}"`).join(', ')}]` : '',
    '---',
    '',
    `# Session — ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    '## Summary',
    '',
    opts.summary || '(no summary)',
    '',
  ];

  if (topics.length) {
    lines.push('## Topics', '');
    topics.forEach(t => lines.push(`- ${t}`));
    lines.push('');
  }
  if (decisions.length) {
    lines.push('## Decisions', '');
    decisions.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  }
  if (files.length) {
    lines.push('## Files changed', '');
    files.forEach(f => lines.push(`- \`${f}\``));
    lines.push('');
  }
  if (nextSteps.length) {
    lines.push('## Next steps', '');
    nextSteps.forEach(n => lines.push(`- ${n}`));
    lines.push('');
  }
  if (opts.context) {
    lines.push('## Additional context', '', opts.context, '');
  }

  fs.writeFileSync(filePath, lines.filter(l => l !== '').join('\n') + '\n');

  const index = loadIndex();
  index.sessions.push({
    id: sessionId,
    date: now.toISOString(),
    project: projectName,
    file: fileName,
    topics,
    summary: (opts.summary || '').substring(0, 200),
  });
  if (index.sessions.length > 500) index.sessions = index.sessions.slice(-500);
  saveIndex(index);

  console.log(`[OK] Session saved: ${filePath}`);
  console.log(`Project: ${projectName}`);
  console.log(`Topics: ${topics.join(', ') || '(none)'}`);
  return { file: filePath, id: sessionId };
}

// ── Search ──────────────────────────────────────────────────────────────────

function searchConversations(opts) {
  const query = (opts.query || '').toLowerCase();
  const limit = parseInt(opts.limit || '10', 10);
  const projectFilter = opts.project || null;

  const index = loadIndex();
  let results = index.sessions;

  if (projectFilter) results = results.filter(s => s.project === projectFilter);
  if (query) {
    results = results.filter(s => {
      const text = [s.summary, ...(s.topics || [])].join(' ').toLowerCase();
      return text.includes(query);
    });
  }

  results = results.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

  if (results.length === 0) {
    console.log('[INFO] No conversations found' + (query ? ` for "${query}"` : ''));
    return [];
  }

  console.log(`\n=== Conversations found: ${results.length} ===\n`);
  results.forEach((s, i) => {
    const date = new Date(s.date).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
    console.log(`${i + 1}. [${date}] ${s.project}`);
    console.log(`   ${s.summary || '(no summary)'}`);
    if (s.topics && s.topics.length) console.log(`   Topics: ${s.topics.join(', ')}`);
    console.log(`   File: ${s.project}/${s.file}\n`);
  });
  return results;
}

// ── List ────────────────────────────────────────────────────────────────────

function listConversations(opts) {
  return searchConversations({ ...opts, query: '' });
}

// ── Recent ──────────────────────────────────────────────────────────────────

function recentConversations(opts) {
  const days = parseInt(opts.days || '7', 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const index = loadIndex();
  let results = index.sessions.filter(s => new Date(s.date) >= cutoff);
  if (opts.project) results = results.filter(s => s.project === opts.project);
  results = results.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (results.length === 0) {
    console.log(`[INFO] No conversations in the last ${days} day(s)`);
    return [];
  }

  console.log(`\n=== Recent conversations (${days} day(s)): ${results.length} ===\n`);

  const byProject = {};
  results.forEach(s => {
    if (!byProject[s.project]) byProject[s.project] = [];
    byProject[s.project].push(s);
  });

  Object.entries(byProject).forEach(([project, sessions]) => {
    console.log(`--- ${project} (${sessions.length} sessions) ---`);
    sessions.forEach(s => {
      const date = new Date(s.date).toLocaleDateString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      console.log(`  [${date}] ${s.summary || '(no summary)'}`);
      if (s.topics && s.topics.length) console.log(`    Topics: ${s.topics.join(', ')}`);
    });
    console.log('');
  });
  return results;
}

// ── Read ────────────────────────────────────────────────────────────────────

function readConversation(opts) {
  if (!opts.project || !opts.file) {
    console.log('[ERROR] --project and --file required');
    return null;
  }
  const filePath = path.join(LOGS_DIR, opts.project, opts.file);
  if (!fs.existsSync(filePath)) {
    console.log(`[ERROR] Not found: ${filePath}`);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
  return content;
}

// ── Deep search ─────────────────────────────────────────────────────────────

function deepSearch(opts) {
  const query = (opts.query || '').toLowerCase();
  const limit = parseInt(opts.limit || '5', 10);
  if (!query) { console.log('[ERROR] --query required'); return []; }

  const results = [];
  const projects = fs.readdirSync(LOGS_DIR).filter(f => {
    try { return fs.statSync(path.join(LOGS_DIR, f)).isDirectory(); } catch { return false; }
  });

  for (const project of projects) {
    if (opts.project && project !== opts.project) continue;
    const projectDir = path.join(LOGS_DIR, project);
    const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(projectDir, file), 'utf-8').toLowerCase();
      if (content.includes(query)) {
        const lines = content.split('\n');
        const matchLines = [];
        lines.forEach((line, i) => {
          if (line.includes(query)) {
            matchLines.push(...lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)));
          }
        });
        results.push({ project, file, matches: matchLines.slice(0, 6).join('\n') });
      }
    }
    if (results.length >= limit) break;
  }

  if (results.length === 0) {
    console.log(`[INFO] "${query}" not found in any conversation`);
    return [];
  }

  console.log(`\n=== Deep search: "${query}" — ${results.length} result(s) ===\n`);
  results.slice(0, limit).forEach((r, i) => {
    console.log(`${i + 1}. ${r.project}/${r.file}`);
    console.log(`   ${r.matches.substring(0, 200)}\n`);
  });
  return results;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      opts[key] = val;
      if (val !== 'true') i++;
    }
  }
  return opts;
}

const [,, command, ...args] = process.argv;
const opts = parseArgs(args);

const commands = {
  save: () => saveConversation(opts),
  search: () => searchConversations(opts),
  list: () => listConversations(opts),
  recent: () => recentConversations(opts),
  read: () => readConversation(opts),
  'deep-search': () => deepSearch(opts),
};

if (command && commands[command]) {
  commands[command]();
} else {
  console.log('Claude Session Memory — Conversation Logger');
  console.log('');
  console.log('Commands:');
  console.log('  save          Save a conversation summary');
  console.log('  search        Search index by query');
  console.log('  deep-search   Full-text search across all files');
  console.log('  list          List conversations for a project');
  console.log('  recent        Show recent conversations');
  console.log('  read          Read a specific conversation');
  console.log('');
  console.log('Options:');
  console.log('  --project     Project name');
  console.log('  --summary     Conversation summary');
  console.log('  --topics      Comma-separated topics');
  console.log('  --files       Comma-separated modified files');
  console.log('  --decisions   Comma-separated decisions');
  console.log('  --nextSteps   Comma-separated next steps');
  console.log('  --context     Additional context');
  console.log('  --query       Search text');
  console.log('  --limit       Max results (default: 10)');
  console.log('  --days        Days to search (default: 7)');
}
