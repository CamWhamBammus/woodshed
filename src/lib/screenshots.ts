import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SCAN_ROOTS, SCREENSHOT_LOG_PATH, ensureStateDir, type ScanRootKey } from "./paths";
import { assertPathIsSafeToTouch } from "./trash";
import type { TrashResult } from "@/types";

// Covers modern macOS naming ("Screenshot 2026-08-13 at 3.42.11 PM.png"),
// legacy naming ("Screen Shot 2020-01-01 at 3.42.11 PM.png"), and the
// " (1)" suffix macOS appends when two are taken in the same second.
const SCREENSHOT_NAME = /^(Screenshot|Screen Shot) \d{4}-\d{2}-\d{2} at .+?(\s\(\d+\))?\.(png|jpe?g)$/i;

const SCREENSHOT_ROOTS: ScanRootKey[] = ["desktop", "downloads"];

export interface ScreenshotEntry {
  path: string;
  name: string;
  root: ScanRootKey;
  sizeBytes: number;
  mtimeMs: number;
}

/** Loose top-level files only — matches organize.ts's restraint, and means a filed screenshot is never re-suggested. */
export async function findScreenshots(): Promise<ScreenshotEntry[]> {
  const found: ScreenshotEntry[] = [];

  for (const rootKey of SCREENSHOT_ROOTS) {
    const root = SCAN_ROOTS[rootKey];
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !SCREENSHOT_NAME.test(entry.name)) continue;
      const full = path.join(root, entry.name);
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat) continue;
      found.push({ path: full, name: entry.name, root: rootKey, sizeBytes: stat.size, mtimeMs: stat.mtimeMs });
    }
  }

  return found.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

interface ScreenshotLogEntry {
  id: string;
  timestamp: string;
  moves: { from: string; to: string }[];
  undone: boolean;
}

function readLog(): ScreenshotLogEntry[] {
  if (!fs.existsSync(SCREENSHOT_LOG_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCREENSHOT_LOG_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeLog(entries: ScreenshotLogEntry[]) {
  ensureStateDir();
  fs.writeFileSync(SCREENSHOT_LOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

function monthKey(mtimeMs: number): string {
  const d = new Date(mtimeMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Moves each screenshot into `<root>/Screenshots/YYYY-MM/<name>` — never clobbers an existing file at the destination. */
export async function fileScreenshots(paths: string[]): Promise<TrashResult[]> {
  const results: TrashResult[] = [];
  const moves: { from: string; to: string }[] = [];

  for (const target of paths) {
    try {
      assertPathIsSafeToTouch(target);
      const stat = await fsp.stat(target).catch(() => null);
      if (!stat) {
        results.push({ path: target, ok: false, error: "No longer exists" });
        continue;
      }
      const destDir = path.join(path.dirname(target), "Screenshots", monthKey(stat.mtimeMs));
      const dest = path.join(destDir, path.basename(target));
      assertPathIsSafeToTouch(destDir);
      assertPathIsSafeToTouch(dest);
      if (fs.existsSync(dest)) {
        results.push({ path: target, ok: false, error: "Already exists at destination" });
        continue;
      }
      await fsp.mkdir(destDir, { recursive: true });
      await fsp.rename(target, dest);
      moves.push({ from: target, to: dest });
      results.push({ path: target, ok: true });
    } catch (err) {
      results.push({ path: target, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (moves.length > 0) {
    const log = readLog();
    log.push({ id: randomUUID(), timestamp: new Date().toISOString(), moves, undone: false });
    writeLog(log);
  }

  return results;
}

export function hasUndoableFileRun(): boolean {
  return readLog().some((e) => !e.undone);
}

export async function undoLastFileRun(): Promise<{ restored: number }> {
  const log = readLog();
  const idx = [...log]
    .map((e, i) => ({ e, i }))
    .reverse()
    .find(({ e }) => !e.undone)?.i;
  if (idx === undefined) return { restored: 0 };

  const entry = log[idx];
  let restored = 0;
  for (const move of entry.moves) {
    assertPathIsSafeToTouch(move.from);
    assertPathIsSafeToTouch(move.to);
    try {
      if (fs.existsSync(move.to) && !fs.existsSync(move.from)) {
        await fsp.rename(move.to, move.from);
        restored++;
      }
    } catch {
      // best effort — leave whatever couldn't be restored where it is
    }
  }

  entry.undone = true;
  writeLog(log);
  return { restored };
}
