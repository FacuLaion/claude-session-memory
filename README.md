# Claude Session Memory

Persistent conversation memory for **Claude Code** in VSCode. Never lose context between sessions again.

## What it does

- **Auto-saves** conversation summaries every hour (configurable)
- **Recovers context** when you open a new session — asks if you want to continue where you left off
- **`/save-session`** — manually save a conversation summary anytime
- **`/recall`** — search and recover context from past conversations
- **Reminds you** to save before a session ends

All conversations are stored as readable `.md` files organized by project.

## Install

### Option 1: Clone and install

```bash
git clone https://github.com/laionfacu/claude-session-memory.git
cd claude-session-memory
bash install.sh
```

### Option 2: One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/laionfacu/claude-session-memory/main/install.sh | bash
```

### What gets installed

| File | Location | Purpose |
|------|----------|---------|
| `conversation-logger.cjs` | `~/.claude/helpers/` | Core logger — save, search, list conversations |
| `autosave-checker.cjs` | `~/.claude/helpers/` | Checks elapsed time, triggers auto-save every 1h |
| `session-context-loader.cjs` | `~/.claude/helpers/` | Loads last conversation on session start |
| `session-save-reminder.cjs` | `~/.claude/helpers/` | Reminds to save before session ends |
| `save-session.md` | `~/.claude/commands/` | `/save-session` skill |
| `recall.md` | `~/.claude/commands/` | `/recall` skill |

### Hooks configured

The installer adds these hooks to `~/.claude/settings.json`:

- **UserPromptSubmit** → `autosave-checker.cjs` (checks if 1h passed)
- **SessionStart** → `session-context-loader.cjs` (loads last conversation)
- **Stop** → `session-save-reminder.cjs` (save reminder)

## Usage

### Save a session

At the end of your work session, type:

```
/save-session
```

Claude will analyze the conversation, extract topics, decisions, files changed, and next steps, then save everything to a markdown file.

### Recall past sessions

To search past conversations:

```
/recall            — show recent sessions (last 7 days)
/recall auth       — search for "auth" across all sessions
/recall dashboard  — search for "dashboard"
```

### Automatic features

These work without any action from you:

1. **Session start**: When you open Claude Code, it checks for a previous conversation in the current project and asks if you want to continue from there
2. **Auto-save (1h)**: Every hour, Claude automatically saves a summary of the current conversation
3. **Session end reminder**: Before closing, you get a reminder to save

### CLI usage (advanced)

You can also use the logger directly from the terminal:

```bash
# Save a conversation
node ~/.claude/helpers/conversation-logger.cjs save \
  --project "my-app" \
  --summary "Implemented OAuth2 login flow" \
  --topics "auth,oauth,login" \
  --files "auth.ts,login.tsx"

# Search conversations
node ~/.claude/helpers/conversation-logger.cjs search --query "auth"

# Deep search (full text)
node ~/.claude/helpers/conversation-logger.cjs deep-search --query "OAuth2"

# Recent conversations
node ~/.claude/helpers/conversation-logger.cjs recent --days 7

# List by project
node ~/.claude/helpers/conversation-logger.cjs list --project "my-app"

# Read specific session
node ~/.claude/helpers/conversation-logger.cjs read --project "my-app" --file "2026-03-20_xxx.md"
```

## Configuration

### Autosave interval

Set the `CLAUDE_SESSION_AUTOSAVE_INTERVAL` environment variable (in minutes):

In `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_SESSION_AUTOSAVE_INTERVAL": "30"
  }
}
```

Default: `60` (1 hour)

## Storage

Conversations are stored in `~/.claude/conversation-logs/`:

```
~/.claude/conversation-logs/
├── index.json                          # Global index for fast search
├── my-app/
│   ├── 2026-03-20_1774038091495.md    # Session log
│   └── 2026-03-21_1774124491495.md
├── another-project/
│   └── 2026-03-19_1773951691495.md
└── .autosave-state.json               # Autosave timer state
```

Each session file is a readable markdown file:

```markdown
---
id: 2026-03-20_1774038091495
date: 2026-03-20T20:21:31.488Z
project: my-app
topics: ["auth", "oauth", "login"]
---

# Session — Wednesday, March 20, 2026

## Summary
Implemented OAuth2 login flow with Google and GitHub providers...

## Topics
- auth
- oauth
- login

## Decisions
- Use PKCE flow for public clients
- Store refresh tokens in httpOnly cookies

## Files changed
- `src/auth/oauth.ts`
- `src/pages/login.tsx`

## Next steps
- Add Microsoft provider
- Write integration tests
```

## Uninstall

```bash
bash uninstall.sh
```

This removes all helpers and skills but keeps your conversation logs. To remove logs too:

```bash
rm -rf ~/.claude/conversation-logs/
```

## Requirements

- Node.js 18+
- Claude Code (VSCode extension)

## License

MIT
