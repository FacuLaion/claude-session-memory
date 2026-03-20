#!/usr/bin/env node
/**
 * Claude Session Memory — Autosave Checker
 *
 * Runs on every UserPromptSubmit hook. Tracks elapsed time since last save.
 * When the configured interval passes (default: 1 hour), outputs a system
 * reminder instructing Claude to auto-save the conversation.
 *
 * Environment variables:
 *   CLAUDE_SESSION_AUTOSAVE_INTERVAL — interval in minutes (default: 60)
 *
 * Part of: claude-session-memory
 * License: MIT
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOGS_DIR = path.join(os.homedir(), '.claude', 'conversation-logs');
const STATE_FILE = path.join(LOGS_DIR, '.autosave-state.json');
const INTERVAL_MINS = parseInt(process.env.CLAUDE_SESSION_AUTOSAVE_INTERVAL || '60', 10);
const INTERVAL_MS = INTERVAL_MINS * 60 * 1000;

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
    catch (e) { return null; }
  }
  return null;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function main() {
  const now = Date.now();
  let state = loadState();

  if (!state) {
    saveState({ sessionStart: now, lastSave: now, saveCount: 0 });
    return;
  }

  const elapsed = now - state.lastSave;

  if (elapsed >= INTERVAL_MS) {
    const hours = Math.floor(elapsed / 3600000);
    const mins = Math.floor((elapsed % 3600000) / 60000);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    console.log(`[AUTOSAVE] ${timeStr} since last save.`);
    console.log(`[AUTOSAVE] ACTION REQUIRED: Run /save-session NOW to save this conversation's progress. Do it silently and automatically — just save a summary of the work done so far without asking the user.`);

    state.lastSave = now;
    state.saveCount = (state.saveCount || 0) + 1;
    saveState(state);
  }
}

main();
