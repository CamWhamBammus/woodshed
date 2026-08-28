import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SCAN_ROOTS } from "./paths";

const execFileAsync = promisify(execFile);

export class UnsafePathError extends Error {}

/**
 * The one gate every destructive action must pass through. Refuses
 * anything that isn't strictly *inside* one of the configured scan roots —
 * never a root itself (so a bug can never trash your whole Downloads
 * folder), and never something that merely starts with the same string
 * (e.g. "~/Downloads-backup" must not match "~/Downloads").
 */
export function assertPathIsSafeToTouch(targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const roots = Object.values(SCAN_ROOTS).map((r) => path.resolve(r));

  const withinARoot = roots.some((root) => {
    if (resolved === root) return false;
    const rel = path.relative(root, resolved);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  });

  if (!withinARoot) {
    throw new UnsafePathError(`Refusing to touch a path outside Woodshed's allowed folders: ${resolved}`);
  }
}

export interface TrashResult {
  path: string;
  ok: boolean;
  error?: string;
}

async function trashOne(targetPath: string): Promise<void> {
  // AppleScript's Finder "delete" moves the item to Trash — recoverable,
  // not an irreversible unlink. The path is passed as an argv item, never
  // interpolated into the script text, so it can't be used for
  // AppleScript or shell injection regardless of what characters it
  // contains (spaces, quotes, etc. all just pass through as data).
  //
  // The path must be assigned to a variable before `POSIX file` can
  // coerce it — `POSIX file (item 1 of argv)` inline fails with "Can't
  // get POSIX file ..." (-1728), verified against a real osascript call.
  await execFileAsync("osascript", [
    "-e", "on run argv",
    "-e", "set thePath to item 1 of argv",
    "-e", "set theFile to POSIX file thePath",
    "-e", 'tell application "Finder" to delete theFile',
    "-e", "end run",
    targetPath,
  ]);
}

/** Moves each path to Trash, validating and reporting per-item so one bad path doesn't abort the batch. */
export async function trashPaths(paths: string[]): Promise<TrashResult[]> {
  const results: TrashResult[] = [];
  for (const target of paths) {
    try {
      assertPathIsSafeToTouch(target);
      if (!fs.existsSync(target)) {
        results.push({ path: target, ok: false, error: "No longer exists" });
        continue;
      }
      await trashOne(target);
      results.push({ path: target, ok: true });
    } catch (err) {
      results.push({ path: target, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
