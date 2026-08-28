import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { duSizeBytes, JUNK_DIR_NAMES } from "./scanner";

const execFileAsync = promisify(execFile);

const ALWAYS_SKIP_DIR_NAMES = new Set([".git"]);
const MAX_DEPTH = 6;
const STALE_AFTER_MS = 180 * 24 * 60 * 60 * 1000;

export interface RepoEntry {
  path: string;
  name: string;
  lastCommitAt: string | null;
  dirty: boolean;
  sizeBytes: number;
  stale: boolean;
}

/** Directories containing a `.git` subdir — stops descending once found, so nested repos/submodules never surface separately. */
async function findRepoRoots(root: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > MAX_DEPTH) return;
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    if (entries.some((e) => e.isDirectory() && e.name === ".git")) {
      found.push(dir);
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink() || !entry.isDirectory()) continue;
      if (ALWAYS_SKIP_DIR_NAMES.has(entry.name) || JUNK_DIR_NAMES.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), depth + 1);
    }
  }

  await walk(root, 0);
  return found;
}

async function lastCommitAt(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoPath, "log", "-1", "--format=%cI"], {
      timeout: 10_000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function isDirty(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoPath, "status", "--porcelain"], { timeout: 10_000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function isStale(lastCommitAtIso: string | null): boolean {
  if (!lastCommitAtIso) return true;
  return Date.now() - new Date(lastCommitAtIso).getTime() > STALE_AFTER_MS;
}

/** Per-repo git metadata + disk size, sorted oldest-commit-first (most stale on top). */
export async function findGitRepos(root: string): Promise<RepoEntry[]> {
  const repoPaths = await findRepoRoots(root);
  const entries: RepoEntry[] = [];

  for (const repoPath of repoPaths) {
    const [commitAt, dirty, sizeBytes] = await Promise.all([
      lastCommitAt(repoPath),
      isDirty(repoPath),
      duSizeBytes(repoPath),
    ]);
    entries.push({
      path: repoPath,
      name: path.basename(repoPath),
      lastCommitAt: commitAt,
      dirty,
      sizeBytes,
      stale: isStale(commitAt),
    });
  }

  entries.sort((a, b) => {
    const at = a.lastCommitAt ? new Date(a.lastCommitAt).getTime() : 0;
    const bt = b.lastCommitAt ? new Date(b.lastCommitAt).getTime() : 0;
    return at - bt;
  });

  return entries;
}
