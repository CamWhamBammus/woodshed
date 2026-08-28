import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * The only folders Woodshed is ever allowed to scan, report on, or touch.
 * Every scan and every trash/organize action validates its target against
 * these roots — see lib/trash.ts's assertPathIsSafeToTouch. Nothing here
 * is user-configurable from the UI on purpose: broadening scope is a
 * decision to make deliberately in code, not a text field someone can
 * fat-finger into "/".
 */
export const SCAN_ROOTS = {
  code: path.join(os.homedir(), "Organized", "Code"),
  downloads: path.join(os.homedir(), "Downloads"),
  desktop: path.join(os.homedir(), "Desktop"),
} as const;

export type ScanRootKey = keyof typeof SCAN_ROOTS;

export const STATE_DIR = path.join(process.cwd(), ".runtime");
export const ORGANIZE_LOG_PATH = path.join(STATE_DIR, "organize-log.json");
export const SCREENSHOT_LOG_PATH = path.join(STATE_DIR, "screenshot-log.json");

export function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}
