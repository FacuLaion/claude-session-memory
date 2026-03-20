#!/bin/bash
# Claude Session Memory — Uninstaller

set -e

CLAUDE_DIR="$HOME/.claude"
HELPERS_DIR="$CLAUDE_DIR/helpers"
COMMANDS_DIR="$CLAUDE_DIR/commands"

echo "Removing Claude Session Memory..."

# Remove helpers
for f in conversation-logger.cjs autosave-checker.cjs session-context-loader.cjs session-save-reminder.cjs; do
  rm -f "$HELPERS_DIR/$f" && echo "  Removed $f"
done

# Remove skills
for f in save-session.md recall.md; do
  rm -f "$COMMANDS_DIR/$f" && echo "  Removed $f"
done

echo ""
echo "Uninstalled. Your conversation logs in ~/.claude/conversation-logs/ were NOT deleted."
echo "To remove logs too: rm -rf ~/.claude/conversation-logs/"
echo ""
echo "Note: Hooks in settings.json were not removed automatically."
echo "Edit ~/.claude/settings.json to remove the autosave-checker, session-context-loader, and session-save-reminder hooks if desired."
