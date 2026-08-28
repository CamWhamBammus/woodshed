import fsp from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SCAN_ROOTS, type ScanRootKey, ORGANIZE_LOG_PATH, ensureStateDir } from "./paths";
import { assertPathIsSafeToTouch } from "./trash";

const CATEGORY_RULES: { category: string; extensions: string[] }[] = [
  { category: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg", "bmp", "tiff", "tif"] },
  { category: "Documents", extensions: ["pdf", "doc", "docx", "txt", "rtf", "pages", "md"] },
  { category: "Spreadsheets", extensions: ["xls", "xlsx", "csv", "numbers"] },
  { category: "Presentations", extensions: ["ppt", "pptx", "key"] },
  { category: "Archives", extensions: ["zip", "tar", "gz", "tgz", "rar", "7z", "dmg"] },
  { category: "Audio", extensions: ["mp3", "wav", "aac", "flac", "m4a"] },
  { category: "Video", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
];

const EXT_TO_CATEGORY = new Map<string, string>();
for (const rule of CATEGORY_RULES) {
  for (const ext of rule.extensions) EXT_TO_CATEGORY.set(ext, rule.category);
}

export interface OrganizePlanItem {
  category: string;
  files: { name: string; from: string; to: string }[];
}

export interface OrganizePlan {
  root: string;
  items: OrganizePlanItem[];
  uncategorizedCount: number;
}

/** Only ever looks at loose top-level files — directories (including .app bundles) are never touched or descended into. */
export async function previewOrganize(rootKey: ScanRootKey): Promise<OrganizePlan> {
  const root = SCAN_ROOTS[rootKey];
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const byCategory = new Map<string, { name: string; from: string; to: string }[]>();
  let uncategorizedCount = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith(".")) continue;

    const ext = path.extname(entry.name).slice(1).toLowerCase();
    const category = EXT_TO_CATEGORY.get(ext);
    if (!category) {
      uncategorizedCount++;
      continue;
    }

    const from = path.join(root, entry.name);
    const to = path.join(root, category, entry.name);
    const list = byCategory.get(category) ?? [];
    list.push({ name: entry.name, from, to });
    byCategory.set(category, list);
  }

  const items = [...byCategory.entries()].map(([category, files]) => ({ category, files }));
  return { root, items, uncategorizedCount };
}

interface OrganizeLogEntry {
  id: string;
  rootKey: ScanRootKey;
  timestamp: string;
  moves: { from: string; to: string }[];
  undone: boolean;
}

function readLog(): OrganizeLogEntry[] {
  if (!fs.existsSync(ORGANIZE_LOG_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ORGANIZE_LOG_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeLog(entries: OrganizeLogEntry[]) {
  ensureStateDir();
  fs.writeFileSync(ORGANIZE_LOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

/** Re-derives the plan and executes it fresh, so nothing stale from an earlier preview can be applied. */
export async function applyOrganize(rootKey: ScanRootKey): Promise<{ moved: number; skipped: number }> {
  const plan = await previewOrganize(rootKey);
  const moves: { from: string; to: string }[] = [];
  let skipped = 0;

  for (const item of plan.items) {
    const categoryDir = path.join(plan.root, item.category);
    assertPathIsSafeToTouch(categoryDir);
    await fsp.mkdir(categoryDir, { recursive: true });

    for (const file of item.files) {
      assertPathIsSafeToTouch(file.from);
      assertPathIsSafeToTouch(file.to);
      try {
        if (fs.existsSync(file.to)) {
          skipped++; // never clobber an existing file at the destination
          continue;
        }
        await fsp.rename(file.from, file.to);
        moves.push({ from: file.from, to: file.to });
      } catch {
        skipped++;
      }
    }
  }

  const log = readLog();
  log.push({ id: randomUUID(), rootKey, timestamp: new Date().toISOString(), moves, undone: false });
  writeLog(log);

  return { moved: moves.length, skipped };
}

export function getLastRun(rootKey: ScanRootKey) {
  const log = readLog();
  const runs = log.filter((e) => e.rootKey === rootKey && !e.undone);
  return runs.length ? runs[runs.length - 1] : null;
}

export async function undoLastRun(rootKey: ScanRootKey): Promise<{ restored: number }> {
  const log = readLog();
  const idx = [...log]
    .map((e, i) => ({ e, i }))
    .reverse()
    .find(({ e }) => e.rootKey === rootKey && !e.undone)?.i;
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
