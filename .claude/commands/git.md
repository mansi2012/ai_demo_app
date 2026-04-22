---
description: Git operations — commit, push, pr, new-branch, status
---

Run the git operation specified in "$ARGUMENTS".

## Operations

### status
Show current branch, `git status`, last 10 commits (`git log --oneline -10`), and whether the branch is ahead/behind remote.

### commit
1. Run `git status` and `git diff` to understand changes
2. Run `git log --oneline -5` to match commit message style
3. Stage only relevant files — never stage `.env`, credentials, or `node_modules`
4. Write a concise commit message (1-2 sentences) focusing on the "why"
5. Create the commit — do NOT push unless explicitly asked

### push
1. Confirm all changes are committed
2. If no upstream, push with `-u` flag
3. If upstream exists, push normally
4. Never force push to main/master

### pr
1. Run `git log` and `git diff main...HEAD` to understand all commits
2. Ensure changes are committed and pushed
3. Create PR using `gh pr create` with title (under 70 chars), "## Summary" and "## Test plan" sections

### new-branch [name]
1. Check for uncommitted changes — warn if any
2. Fetch latest with `git fetch origin`
3. Create and switch to new branch from `origin/main`
4. Confirm with `git branch --show-current`
