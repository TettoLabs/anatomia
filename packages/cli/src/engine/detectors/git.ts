/**
 * Git repository detection
 *
 * Detects git metadata: HEAD, branch, commit count, contributors, etc.
 * Gracefully returns nulls if not a git repo.
 */

import { execSync } from 'node:child_process';

export interface GitInfo {
  head: string | null;
  branch: string | null;
  commitCount: number | null;
  lastCommitAt: string | null;
  uncommittedChanges: boolean;
  contributorCount: number | null;
}

function gitExec(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Detect git repository information.
 * Returns nulls for all fields if not a git repo or git is unavailable.
 */
export async function detectGitInfo(cwd: string): Promise<GitInfo> {
  // Check if this is a git repo
  const head = gitExec('git rev-parse --short HEAD', cwd);
  if (!head) {
    return {
      head: null,
      branch: null,
      commitCount: null,
      lastCommitAt: null,
      uncommittedChanges: false,
      contributorCount: null,
    };
  }

  const branch = gitExec('git rev-parse --abbrev-ref HEAD', cwd);

  const commitCountStr = gitExec('git rev-list --count HEAD', cwd);
  const commitCount = commitCountStr ? parseInt(commitCountStr, 10) : null;

  const lastCommitAt = gitExec('git log -1 --format=%aI', cwd);

  const statusOutput = gitExec('git status --porcelain', cwd);
  const uncommittedChanges = statusOutput !== null && statusOutput.length > 0;

  const contributorStr = gitExec('git shortlog -sn --all', cwd);
  const contributorCount = contributorStr
    ? contributorStr.split('\n').filter(l => l.trim().length > 0).length
    : null;

  return {
    head,
    branch,
    commitCount,
    lastCommitAt,
    uncommittedChanges,
    contributorCount,
  };
}
