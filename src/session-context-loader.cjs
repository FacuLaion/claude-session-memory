#!/usr/bin/env node
/**
 * Claude Session Memory — Session Context Loader
 *
 * Runs on SessionStart hook. Finds the most recent conversation log
 * for the current project and presents it, asking the user if they
 * want to continue from where they left off.
 *
 * Part of: claude-session-memory
 * License: MIT
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOGS_DIR = path.join(os.homedir(), '.claude', 'conversation-logs');
const INDEX_FILE = path.join(LOGS_DIR, 'index.json');

function getProjectName() {
  const cwd = process.cwd();
  const patterns = [
    /Desktop\/([^/]+)/,
    /Documents\/([^/]+)/,
    /Projects?\/([^/]+)/i,
    /repos?\/([^/]+)/i,
    /src\/([^/]+)/i,
  ];
  for (const p of patterns) {
    const m = cwd.match(p);
    if (m) return m[1];
  }
  return path.basename(cwd).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function findRecentConversation(projectName) {
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      const sessions = index.sessions
        .filter(s => s.project === projectName)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      if (sessions.length > 0) return sessions[0];
    } catch (e) { /* fallthrough */ }
  }

  const dir = path.join(LOGS_DIR, projectName);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse();
  if (files.length === 0) return null;
  return { project: projectName, file: files[0], date: null };
}

function findMostRecentAcrossProjects() {
  if (!fs.existsSync(INDEX_FILE)) return null;
  try {
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    if (index.sessions.length === 0) return null;
    return index.sessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  } catch (e) { return null; }
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return 'just now';
}

function main() {
  const projectName = getProjectName();
  let session = findRecentConversation(projectName);
  let fromOther = false;

  if (!session) {
    session = findMostRecentAcrossProjects();
    if (session) fromOther = true;
  }

  if (!session) return;

  const filePath = path.join(LOGS_DIR, session.project, session.file);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  const timeAgo = session.date ? formatTimeAgo(session.date) : '';

  const out = [];
  out.push('[SESSION_CONTEXT] Previous conversation found.');
  out.push(`Project: ${session.project}${fromOther ? ' (different project)' : ''}`);
  if (timeAgo) out.push(`When: ${timeAgo}`);
  out.push('');
  out.push('--- LAST SESSION CONTENT ---');
  out.push(content);
  out.push('--- END OF LAST SESSION ---');
  out.push('');
  out.push('[INSTRUCTION] Present the user with a brief summary of the last session and ask if they want to continue from there. Example: "I found your last session for [project] ([time]). You worked on [summary]. Want to continue from there?"');

  console.log(out.join('\n'));

  // Reset autosave timer for new session
  const autosaveState = path.join(LOGS_DIR, '.autosave-state.json');
  fs.writeFileSync(autosaveState, JSON.stringify({
    sessionStart: Date.now(), lastSave: Date.now(), saveCount: 0
  }, null, 2));
}

main();
