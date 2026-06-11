#!/bin/bash
# Git re-initialization script for verse8 sessions
# Run this when .git directory is lost between sessions
set -e

if [ -d ".git" ]; then
  echo "Git already initialized. Pulling latest..."
  git pull origin master 2>/dev/null && echo "Up to date." || echo "Pull skipped (no upstream or already latest)."
  exit 0
fi

echo "Re-initializing git..."
source .env 2>/dev/null || true

REMOTE="${GIT_REMOTE_ADDRESS:-https://github.com/YTcd/MapleSlot_verse8.git}"
TOKEN="${GIT_ACCESS_TOKEN:-}"

if [ -n "$TOKEN" ]; then
  REMOTE_AUTH=$(echo "$REMOTE" | sed "s|https://|https://${TOKEN}@|")
else
  REMOTE_AUTH="$REMOTE"
fi

git init
git config user.name "Agent8"
git config user.email "agent8@verse8.io"
git remote add origin "$REMOTE_AUTH"

echo "Fetching remote..."
git fetch origin master 2>/dev/null || { echo "Warning: Could not fetch from remote"; }

if git rev-parse origin/master >/dev/null 2>&1; then
  echo "Remote found. Syncing with local files..."
  git add -A
  git commit -m "Local working state" --allow-empty 2>/dev/null || true
  git merge origin/master --allow-unrelated-histories -X ours -m "Sync with remote master" 2>/dev/null || {
    echo "Merge conflicts resolved automatically (local changes preserved)."
    git checkout --ours -- . 2>/dev/null || true
    git add -A
    git commit -m "Sync with remote master (resolved)" --allow-empty 2>/dev/null || true
  }
  echo "Git ready. Run 'git push origin master' to push your changes."
else
  echo "No remote branch found. Starting fresh."
  git add -A
  git commit -m "Initial commit" --allow-empty 2>/dev/null || true
fi

echo "Done! Git is initialized and connected to remote."
