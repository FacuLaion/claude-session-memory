---
description: Search and recover context from past conversations. Use to resume previous work, remember decisions, or find what was done in earlier sessions.
---

# Recall Past Session Context

Your task is to search and present context from previously saved conversations.

## Instructions

Based on what the user asks, execute one of these commands:

### Recent sessions:
```bash
node ~/.claude/helpers/conversation-logger.cjs recent --days 7
```

### Search for something specific:
```bash
node ~/.claude/helpers/conversation-logger.cjs search --query "SEARCH_TERM" --limit 10
```

### Deep search (full text across all files):
```bash
node ~/.claude/helpers/conversation-logger.cjs deep-search --query "SEARCH_TERM" --limit 5
```

### Sessions for a specific project:
```bash
node ~/.claude/helpers/conversation-logger.cjs list --project "PROJECT_NAME" --limit 20
```

### Read a specific session:
```bash
node ~/.claude/helpers/conversation-logger.cjs read --project "PROJECT_NAME" --file "FILENAME.md"
```

## After searching

1. **Present results** clearly and organized
2. If relevant sessions are found, **read the full file** of the most relevant ones using the Read tool
3. **Summarize the recovered context** so the user can resume their work
4. If the user provides arguments (e.g., `/recall auth`), use them as the search query

## No arguments

If the user just types `/recall` with no arguments:
1. Show recent sessions (last 7 days)
2. Ask if they want to search for something specific

## Notes
- Logs are in `~/.claude/conversation-logs/{project}/`
- Each log is a `.md` file with YAML frontmatter
- The global index is at `~/.claude/conversation-logs/index.json`
