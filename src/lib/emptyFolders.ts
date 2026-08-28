import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { SCAN_ROOTS, type ScanRootKey } from "./paths";

const MAX_DEPTH = 14;

export interface EmptyFolderEntry {
  path: string;
  root: ScanRootKey;
  mtimeMs: number;
}

interface WalkChild {
  path: string;
  mtimeMs: number;
}

/**
 * A directory is "empty" if it has no files anywhere within it, recursively
 * — so a folder containing only other empty folders still counts. Reports
 * only the topmost directory of each empty chain (deleting it removes the
 * already-empty children too) and never the scan root itself. The `isRoot`
 * flag forces reporting at the root level even when the *whole* root is
 * nothing but a chain of empty folders — without it, that chain would
 * bubble up as "the root is empty too" and get silently discarded.
 */
async function walk(dir: string, depth: number, isRoot: boolean, found: WalkChild[]): Promise<boolean> {
  if (depth > MAX_DEPTH) return false;

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  let hasContent = false;
  const children: { path: string; empty: boolean }[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      hasContent = true;
      continue;
    }
    if (entry.isDirectory()) {
      if (entry.name === ".git") {
        hasContent = true; // a repo root, not an empty folder
        continue;
      }
      children.push({ path: full, empty: await walk(full, depth + 1, false, found) });
    } else {
      hasContent = true;
    }
  }

  const selfEmpty = !hasContent && children.every((c) => c.empty);

  if (!selfEmpty || isRoot) {
    for (const child of children) {
      if (!child.empty) continue;
      const stat = await fsp.stat(child.path).catch(() => null);
      found.push({ path: child.path, mtimeMs: stat?.mtimeMs ?? 0 });
    }
  }

  return selfEmpty;
}

/** Genuinely empty directories across all three scan roots, tagged with which root they're under. */
export async function findEmptyFolders(): Promise<EmptyFolderEntry[]> {
  const results: EmptyFolderEntry[] = [];

  for (const rootKey of Object.keys(SCAN_ROOTS) as ScanRootKey[]) {
    const found: WalkChild[] = [];
    await walk(SCAN_ROOTS[rootKey], 0, true, found);
    for (const entry of found) results.push({ path: entry.path, root: rootKey, mtimeMs: entry.mtimeMs });
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}
