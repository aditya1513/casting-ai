#!/bin/bash

# Update window status in ACTIVE_WORK.md
# Usage: ./update-window-status.sh <window_number> <status> [message]

WINDOW="$1"
STATUS="$2"
MESSAGE="$3"
ACTIVE_WORK_FILE=".claude/ACTIVE_WORK.md"

if [ -z "$WINDOW" ] || [ -z "$STATUS" ]; then
    echo "Usage: $0 <window_number> <status> [message]"
    echo "Status options: active, standby, blocked, merging"
    echo "Example: $0 1 active 'Implementing Qdrant service'"
    exit 1
fi

# Status emoji mapping
case "$STATUS" in
    "active")
        EMOJI="🟢"
        ;;
    "standby")
        EMOJI="🟡"
        ;;
    "blocked")
        EMOJI="🔴"
        ;;
    "merging")
        EMOJI="🔵"
        ;;
    *)
        echo "Unknown status: $STATUS"
        echo "Use: active, standby, blocked, or merging"
        exit 1
        ;;
esac

# Update timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

echo "Updating Window $WINDOW status to $STATUS..."

# Add status update to history (append to file)
echo "" >> "$ACTIVE_WORK_FILE"
echo "### Status Update - Window $WINDOW" >> "$ACTIVE_WORK_FILE"
echo "- Time: $TIMESTAMP" >> "$ACTIVE_WORK_FILE"
echo "- Status: $EMOJI $STATUS" >> "$ACTIVE_WORK_FILE"
if [ ! -z "$MESSAGE" ]; then
    echo "- Message: $MESSAGE" >> "$ACTIVE_WORK_FILE"
fi

echo "✅ Status updated successfully"
echo "   Window $WINDOW is now: $EMOJI $STATUS"
if [ ! -z "$MESSAGE" ]; then
    echo "   Message: $MESSAGE"
fi