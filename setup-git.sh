#!/bin/bash
# Git re-initialization script for verse8 sessions
# Run this when .git directory is lost between sessions
# Preserves remote history, only commits actual local changes
set -e

if [ -d ".git" ]; then
  echo "Git already initialized. Pulling latest..."
  git pull origin master 2>/dev/null && echo "Up to date." || echo "Pull skipped."
  exit 0
fi

echo "Re-initializing git (preserving remote history)..."
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
git fetch origin master 2>/dev/null || {
  echo "No remote found. Starting fresh."
  git add -A
  git commit -m "Initial commit" --allow-empty 2>/dev/null || true
  exit 0
}

# Create master branch from remote (metadata only, no checkout)
git update-ref refs/heads/master origin/master

# Load remote's tree into index without touching working tree
git read-tree HEAD

# Stage working tree changes relative to remote tree
git add -A

# Commit only the actual diff
git commit -m "local changes" --allow-empty 2>/dev/null || true

echo "Done! Git connected to remote. Only actual changes committed."
echo "Run 'git push origin master' to push."
