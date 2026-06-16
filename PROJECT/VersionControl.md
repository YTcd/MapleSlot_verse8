# Git Workflow

> Reference this document only when performing git-related operations.

## Branch Strategy

- Use a single branch only: `master`.
- Never create additional branches.

## Push Target

- Always push to `remote/master` exclusively.

## Before Every Commit or Push

1. **Fetch first** to detect any upstream changes before committing or pushing.
   ```
   git fetch origin
   ```

2. **Pull if behind** — if `origin/master` has commits ahead of local, pull before proceeding.
   ```
   git pull origin master
   ```

3. **Handle conflicts via stash** — if a pull cannot proceed due to local changes:
   1. Stash current work.
      ```
      git stash
      ```
   2. Pull to bring in upstream changes.
      ```
      git pull origin master
      ```
   3. Re-apply the stash.
      ```
      git stash pop
      ```
   4. Resolve any merge conflicts by referencing the user's prior requests in the current conversation to determine the correct intent, then finalize the resolution.

4. Once the working tree is clean and up to date, commit and push.
   ```
   git push origin master
   ```
