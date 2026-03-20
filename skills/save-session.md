---
description: Save a summary of the current conversation to preserve context for future sessions. Use at the end of each work session or whenever you want to bookmark important context.
---

# Save Session

Your task is to save a complete summary of the current conversation so it can be recovered in future sessions.

## Instructions

1. **Analyze the full conversation** and extract:
   - **Summary**: A paragraph describing what was done in this session
   - **Topics**: List of main topics discussed (e.g., "authentication", "dashboard UI", "API bug")
   - **Decisions**: Technical or design decisions made during the chat
   - **Files changed**: List of files created or edited
   - **Next steps**: Pending tasks or things left for later
   - **Additional context**: Any important info that helps resume the work

2. **Determine the project** based on the current working directory or files touched.

3. **Execute the save command**:

```bash
node ~/.claude/helpers/conversation-logger.cjs save \
  --project "PROJECT_NAME" \
  --projectPath "FULL_PROJECT_PATH" \
  --summary "COMPLETE_SESSION_SUMMARY" \
  --topics "topic1,topic2,topic3" \
  --files "file1.ts,file2.tsx" \
  --decisions "decision1,decision2" \
  --nextSteps "step1,step2" \
  --context "RELEVANT_ADDITIONAL_CONTEXT"
```

4. **Confirm to the user** that it was saved and show a brief summary.

## Notes

- Be concise but complete — the goal is for a future session to resume work without losing context
- If the user provides additional arguments with the command, use them as guidance for the summary
- Logs are saved to `~/.claude/conversation-logs/{project}/`
