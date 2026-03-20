#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         Claude Session Memory — Installer                   ║
# ║  Persistent conversation memory for Claude Code in VSCode   ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/USER/claude-session-memory/main/install.sh | bash
#   — or —
#   git clone https://github.com/USER/claude-session-memory && cd claude-session-memory && bash install.sh
#

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CLAUDE_DIR="$HOME/.claude"
HELPERS_DIR="$CLAUDE_DIR/helpers"
COMMANDS_DIR="$CLAUDE_DIR/commands"
LOGS_DIR="$CLAUDE_DIR/conversation-logs"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Claude Session Memory Installer    ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Detect source directory ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# If run via curl pipe, download files to temp dir
if [ ! -f "$SCRIPT_DIR/src/conversation-logger.cjs" ]; then
  echo -e "${YELLOW}Downloading files...${NC}"
  TEMP_DIR=$(mktemp -d)
  SCRIPT_DIR="$TEMP_DIR"
  mkdir -p "$TEMP_DIR/src" "$TEMP_DIR/skills"

  BASE_URL="https://raw.githubusercontent.com/laionfacu/claude-session-memory/main"
  curl -fsSL "$BASE_URL/src/conversation-logger.cjs" -o "$TEMP_DIR/src/conversation-logger.cjs"
  curl -fsSL "$BASE_URL/src/autosave-checker.cjs" -o "$TEMP_DIR/src/autosave-checker.cjs"
  curl -fsSL "$BASE_URL/src/session-context-loader.cjs" -o "$TEMP_DIR/src/session-context-loader.cjs"
  curl -fsSL "$BASE_URL/src/session-save-reminder.cjs" -o "$TEMP_DIR/src/session-save-reminder.cjs"
  curl -fsSL "$BASE_URL/skills/save-session.md" -o "$TEMP_DIR/skills/save-session.md"
  curl -fsSL "$BASE_URL/skills/recall.md" -o "$TEMP_DIR/skills/recall.md"
  echo -e "${GREEN}✓ Files downloaded${NC}"
fi

# ── Create directories ───────────────────────────────────────────────────────

echo -e "${CYAN}Creating directories...${NC}"
mkdir -p "$HELPERS_DIR" "$COMMANDS_DIR" "$LOGS_DIR"
echo -e "${GREEN}✓ Directories ready${NC}"

# ── Copy source files ────────────────────────────────────────────────────────

echo -e "${CYAN}Installing helpers...${NC}"
cp "$SCRIPT_DIR/src/conversation-logger.cjs" "$HELPERS_DIR/conversation-logger.cjs"
cp "$SCRIPT_DIR/src/autosave-checker.cjs" "$HELPERS_DIR/autosave-checker.cjs"
cp "$SCRIPT_DIR/src/session-context-loader.cjs" "$HELPERS_DIR/session-context-loader.cjs"
cp "$SCRIPT_DIR/src/session-save-reminder.cjs" "$HELPERS_DIR/session-save-reminder.cjs"
chmod +x "$HELPERS_DIR/conversation-logger.cjs"
chmod +x "$HELPERS_DIR/autosave-checker.cjs"
chmod +x "$HELPERS_DIR/session-context-loader.cjs"
chmod +x "$HELPERS_DIR/session-save-reminder.cjs"
echo -e "${GREEN}✓ Helpers installed${NC}"

echo -e "${CYAN}Installing skills...${NC}"
cp "$SCRIPT_DIR/skills/save-session.md" "$COMMANDS_DIR/save-session.md"
cp "$SCRIPT_DIR/skills/recall.md" "$COMMANDS_DIR/recall.md"
echo -e "${GREEN}✓ Skills installed (/save-session, /recall)${NC}"

# ── Configure hooks in settings.json ─────────────────────────────────────────

echo -e "${CYAN}Configuring hooks...${NC}"

if [ ! -f "$SETTINGS_FILE" ]; then
  # No settings.json exists — create one from scratch
  cat > "$SETTINGS_FILE" << 'SETTINGS_EOF'
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/helpers/autosave-checker.cjs",
            "timeout": 3000
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/helpers/session-context-loader.cjs",
            "timeout": 5000
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/helpers/session-save-reminder.cjs",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
SETTINGS_EOF
  echo -e "${GREEN}✓ settings.json created with hooks${NC}"
else
  # settings.json exists — check if hooks are already configured
  if node -e "
    const s = JSON.parse(require('fs').readFileSync('$SETTINGS_FILE','utf-8'));
    const hooks = s.hooks || {};

    let changed = false;

    // Ensure hooks object exists
    if (!s.hooks) { s.hooks = {}; changed = true; }

    // Helper to add a hook to an event
    function addHook(event, cmd, timeout) {
      if (!s.hooks[event]) s.hooks[event] = [];
      const allCmds = s.hooks[event].flatMap(g => (g.hooks || []).map(h => h.command || ''));
      if (allCmds.some(c => c.includes(cmd.split('/').pop().replace('.cjs','')))) return;
      // Add to first group or create new one
      if (s.hooks[event].length > 0 && s.hooks[event][0].hooks) {
        s.hooks[event][0].hooks.push({ type: 'command', command: cmd, timeout });
      } else {
        s.hooks[event].push({ hooks: [{ type: 'command', command: cmd, timeout }] });
      }
      changed = true;
    }

    addHook('UserPromptSubmit', 'node ~/.claude/helpers/autosave-checker.cjs', 3000);
    addHook('SessionStart', 'node ~/.claude/helpers/session-context-loader.cjs', 5000);
    addHook('Stop', 'node ~/.claude/helpers/session-save-reminder.cjs', 3000);

    if (changed) {
      require('fs').writeFileSync('$SETTINGS_FILE', JSON.stringify(s, null, 2));
      console.log('HOOKS_ADDED');
    } else {
      console.log('HOOKS_EXIST');
    }
  " 2>/dev/null | grep -q "HOOKS_ADDED"; then
    echo -e "${GREEN}✓ Hooks added to existing settings.json${NC}"
  else
    echo -e "${GREEN}✓ Hooks already configured${NC}"
  fi
fi

# ── Verify installation ─────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}Verifying installation...${NC}"

ERRORS=0

for f in conversation-logger.cjs autosave-checker.cjs session-context-loader.cjs session-save-reminder.cjs; do
  if [ -f "$HELPERS_DIR/$f" ]; then
    echo -e "  ${GREEN}✓${NC} $f"
  else
    echo -e "  ${RED}✗${NC} $f missing"
    ERRORS=$((ERRORS + 1))
  fi
done

for f in save-session.md recall.md; do
  if [ -f "$COMMANDS_DIR/$f" ]; then
    echo -e "  ${GREEN}✓${NC} /$(basename $f .md) skill"
  else
    echo -e "  ${RED}✗${NC} $f missing"
    ERRORS=$((ERRORS + 1))
  fi
done

# Quick test
if node "$HELPERS_DIR/conversation-logger.cjs" 2>&1 | grep -q "Conversation Logger"; then
  echo -e "  ${GREEN}✓${NC} Logger works"
else
  echo -e "  ${RED}✗${NC} Logger test failed"
  ERRORS=$((ERRORS + 1))
fi

echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}══════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Installation complete!                  ${NC}"
  echo -e "${GREEN}══════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${CYAN}How to use:${NC}"
  echo -e "    ${YELLOW}/save-session${NC}  — Save current conversation"
  echo -e "    ${YELLOW}/recall${NC}        — Search past conversations"
  echo ""
  echo -e "  ${CYAN}Automatic features:${NC}"
  echo -e "    • Auto-save reminder every 1 hour"
  echo -e "    • Session recovery on startup"
  echo -e "    • Save reminder before session ends"
  echo ""
  echo -e "  ${CYAN}Logs stored in:${NC} ~/.claude/conversation-logs/"
  echo ""
  echo -e "  ${CYAN}Configuration:${NC}"
  echo -e "    Set autosave interval (env var):"
  echo -e "    CLAUDE_SESSION_AUTOSAVE_INTERVAL=30  (minutes)"
  echo ""
else
  echo -e "${RED}Installation completed with $ERRORS error(s).${NC}"
  echo -e "${RED}Please check the messages above.${NC}"
  exit 1
fi

# Cleanup temp dir if used
if [ -n "${TEMP_DIR:-}" ] && [ -d "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR"
fi
