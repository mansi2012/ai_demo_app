import { spawnSync } from "node:child_process";
import { PROJECT_ROOT } from "./writeFiles.js";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed: ${err}`);
  }
  return result.stdout.trim();
}

export function currentBranch() {
  return runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
}

export function branchExists(name) {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", "--quiet", `refs/heads/${name}`],
    { cwd: PROJECT_ROOT, encoding: "utf-8" }
  );
  return result.status === 0;
}

export function switchOrCreateBranch(name) {
  if (branchExists(name)) {
    runGit(["checkout", name]);
    return { created: false };
  }
  runGit(["checkout", "-b", name]);
  return { created: true };
}

export function addAndCommit(paths, message) {
  runGit(["add", "--", ...paths]);
  runGit(["commit", "-m", message]);
}

export function pushCurrentBranch() {
  // -u sets upstream if not already set (safe to always pass)
  return runGit(["push", "-u", "origin", "HEAD"]);
}

export function hasRemote(name = "origin") {
  const result = spawnSync("git", ["remote", "get-url", name], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
  });
  return result.status === 0;
}

export function hasGhCli() {
  const result = spawnSync("gh", ["--version"], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
  });
  return !result.error && result.status === 0;
}

/**
 * Create a PR via GitHub CLI. Throws on failure with a readable message.
 * @param {{ base: string, head: string, title: string, body: string }} opts
 * @returns {string} PR URL printed by gh
 */
export function createPullRequest({ base, head, title, body }) {
  const result = spawnSync(
    "gh",
    ["pr", "create", "--base", base, "--head", head, "--title", title, "--body", body],
    { cwd: PROJECT_ROOT, encoding: "utf-8" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `gh pr create exited with status ${result.status}`);
  }
  return (result.stdout || "").trim();
}
