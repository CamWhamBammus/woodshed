import type {
  DuplicateGroup,
  EmptyFolderEntry,
  FileEntry,
  JunkEntry,
  RepoEntry,
  ScanRootKey,
  ScreenshotEntry,
  TrashResult,
} from "@/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Something went wrong.");
  }
  return res.json();
}

export const api = {
  scanDevJunk: () =>
    fetch("/api/scan/dev-junk", { method: "POST" }).then((r) =>
      json<{ entries: JunkEntry[]; totalBytes: number }>(r)
    ),

  scanReport: (root: ScanRootKey) =>
    fetch("/api/scan/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root }),
    }).then((r) =>
      json<{
        largestFiles: FileEntry[];
        duplicateGroups: DuplicateGroup[];
        scannedFileCount: number;
        totalBytes: number;
      }>(r)
    ),

  trash: (paths: string[]) =>
    fetch("/api/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    }).then((r) => json<{ results: TrashResult[] }>(r)),

  organizePreview: (root: "downloads" | "desktop") =>
    fetch("/api/organize/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root }),
    }).then((r) =>
      json<{
        plan: { root: string; items: { category: string; files: { name: string; from: string; to: string }[] }[]; uncategorizedCount: number };
        canUndo: boolean;
      }>(r)
    ),

  organizeApply: (root: "downloads" | "desktop") =>
    fetch("/api/organize/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root }),
    }).then((r) => json<{ moved: number; skipped: number }>(r)),

  organizeUndo: (root: "downloads" | "desktop") =>
    fetch("/api/organize/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root }),
    }).then((r) => json<{ restored: number }>(r)),

  scanScreenshots: () =>
    fetch("/api/scan/screenshots", { method: "POST" }).then((r) =>
      json<{ entries: ScreenshotEntry[]; canUndo: boolean }>(r)
    ),

  fileScreenshots: (paths: string[]) =>
    fetch("/api/screenshots/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    }).then((r) => json<{ results: TrashResult[] }>(r)),

  undoFileRun: () => fetch("/api/screenshots/undo", { method: "POST" }).then((r) => json<{ restored: number }>(r)),

  scanStaleProjects: () =>
    fetch("/api/scan/stale-projects", { method: "POST" }).then((r) => json<{ entries: RepoEntry[] }>(r)),

  scanEmptyFolders: () =>
    fetch("/api/scan/empty-folders", { method: "POST" }).then((r) => json<{ entries: EmptyFolderEntry[] }>(r)),
};
