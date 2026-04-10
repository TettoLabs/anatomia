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
  defaultBranch: string | null;
  branches: string[] | null;
}

function gitExec(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Detect the default branch via 4-step priority:
 * 1. symbolic-ref (fastest, most reliable)
 * 2. remote show (slower, contacts remote)
 * 3. common names (check local refs)
 * 4. fallback to current branch
 */
function detectDefaultBranch(cwd: string, currentBranch: string | null): string | null {
  // Step 1: symbolic-ref refs/remotes/origin/HEAD
  const symbolicRef = gitExec('git symbolic-ref refs/remotes/origin/HEAD', cwd);
  if (symbolicRef) {
    // "refs/remotes/origin/main" → "main"
    const parts = symbolicRef.split('/');
    return parts[parts.length - 1] ?? null;
  }

  // Step 2: remote show origin → parse "HEAD branch:" line
  const remoteShow = gitExec('git remote show origin', cwd);
  if (remoteShow) {
    const match = remoteShow.match(/HEAD branch:\s*(.+)/);
    if (match && match[1] && match[1].trim() !== '(unknown)') {
      return match[1].trim();
    }
  }

  // Step 3: check common branch names that exist locally
  for (const name of ['main', 'master', 'develop', 'dev']) {
    const exists = gitExec(`git rev-parse --verify ${name}`, cwd);
    if (exists) return name;
  }

  // Step 4: fallback to current branch
  return currentBranch;
}

/**
 * Detect all branches (local + remote, deduplicated).
 */
function detectBranches(cwd: string): string[] | null {
  const output = gitExec('git branch -a', cwd);
  if (!output) return null;

  const seen = new Set<string>();
  for (const line of output.split('\n')) {
    let name = line.trim();
    if (!name) continue;
    // Strip leading "* " from current branch
    if (name.startsWith('* ')) name = name.slice(2);
    // Skip HEAD pointer lines like "remotes/origin/HEAD -> origin/main"
    if (name.includes(' -> ')) continue;
    // Strip remote prefix
    name = name.replace(/^remotes\/origin\//, '');
    seen.add(name);
  }

  return [...seen].sort();
}

/**
 * Detect git repository information.
 * Returns nulls for all fields if not a git repo or git is unavailable.
 */
export async function detectGitInfo(cwd: string): Promise<GitInfo> {
  // Check if this is a git repo
  const head = gitExec('git rev-parse --short HEAD', cwd);
  if (!head) {
    // Might still be a git repo with no commits
    const isGitRepo = gitExec('git rev-parse --git-dir', cwd);
    if (!isGitRepo) {
      return {
        head: null,
        branch: null,
        commitCount: null,
        lastCommitAt: null,
        uncommittedChanges: false,
        contributorCount: null,
        defaultBranch: null,
        branches: null,
      };
    }
    // Git repo with no commits — use symbolic-ref to get branch name
    const branch = gitExec('git symbolic-ref --short HEAD', cwd);
    return {
      head: null,
      branch,
      commitCount: 0,
      lastCommitAt: null,
      uncommittedChanges: false,
      contributorCount: null,
      defaultBranch: branch, // In a fresh repo, current branch is the default
      branches: branch ? [branch] : [],
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

  const defaultBranch = detectDefaultBranch(cwd, branch);
  const branches = detectBranches(cwd);

  return {
    head,
    branch,
    commitCount,
    lastCommitAt,
    uncommittedChanges,
    contributorCount,
    defaultBranch,
    branches,
  };
}
