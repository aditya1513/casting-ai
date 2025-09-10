# Claude Window Assignment Guide

## Quick Reference

### Window 1 (This Window)
- **Identity:** Qdrant Migration Specialist
- **Branch:** `feature/qdrant-migration`
- **Focus:** Vector database migration from Pinecone to Qdrant
- **DO:** Work on vector services, Docker setup, migration scripts
- **DON'T:** Touch frontend, UI components, or unrelated backend services

### Window 2 (Other Window)
- **Identity:** General Development & Support
- **Branch:** `main` or `feature/urgent-fixes`
- **Focus:** Bug fixes, frontend work, testing, documentation
- **DO:** Handle urgent issues, work on non-vector services
- **DON'T:** Modify vector service files or migration-related code

## How to Identify Which Window You Are

When starting a session, check:
1. What branch are you on? (`git branch --show-current`)
2. What's in your todo list?
3. Check `.claude/ACTIVE_WORK.md` for your assignment

## Coordination Commands

```bash
# Check if a file is locked before editing
./.claude/check-locks.sh src/services/vector.service.ts

# Update your window status
./.claude/update-window-status.sh 1 active "Working on Qdrant client"

# Check current branch
git branch --show-current

# See what the other window is doing
cat .claude/ACTIVE_WORK.md
```

## If You Need to Switch Context

1. Commit or stash your current work
2. Update ACTIVE_WORK.md with your status
3. Clear any file locks in WINDOW_LOCKS.json
4. Switch branches if needed
5. Update your todo list

## Emergency Coordination

If both windows need the same file:
1. Window with the file should stash: `git stash save "description"`
2. Update ACTIVE_WORK.md
3. Other window can now work
4. When done, first window can: `git stash pop`