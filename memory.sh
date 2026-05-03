#!/usr/bin/env bash
# memory.sh — Launch Claude Code with project context as system prompt

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Build context
CONTEXT=""

# Project primer (session state)
PRIMER="$PROJECT_DIR/primer.md"
if [ -f "$PRIMER" ]; then
  CONTEXT+="$(cat "$PRIMER")

"
fi

# Recent git history
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMITS=$(git log --oneline -5 2>/dev/null || echo "No commits yet")
MODIFIED=$(git diff --name-only HEAD 2>/dev/null || echo "None")

CONTEXT+="## Current Branch
$BRANCH

## Last 5 Commits
$COMMITS

## Modified Files
$MODIFIED
"

# Lessons learned
if [ -f "$PROJECT_DIR/tasks/lessons.md" ]; then
  CONTEXT+="
## Lessons Learned
$(cat "$PROJECT_DIR/tasks/lessons.md")
"
fi

# Recent commit memory
if [ -f "$PROJECT_DIR/.claude-memory.md" ]; then
  CONTEXT+="
## Recent Commit Log
$(tail -20 "$PROJECT_DIR/.claude-memory.md")
"
fi

# Launch Claude with context and permissions
claude \
  --system-prompt "$CONTEXT"
