export interface JunkEntry {
  path: string;
  name: string;
  label: string;
  hint: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface FileEntry {
  path: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface DuplicateGroup {
  sizeBytes: number;
  paths: string[];
}

export interface TrashResult {
  path: string;
  ok: boolean;
  error?: string;
}

export type ScanRootKey = "code" | "downloads" | "desktop";

export interface ScreenshotEntry {
  path: string;
  name: string;
  root: ScanRootKey;
  sizeBytes: number;
  mtimeMs: number;
}

export interface RepoEntry {
  path: string;
  name: string;
  lastCommitAt: string | null;
  dirty: boolean;
  sizeBytes: number;
  stale: boolean;
}

export interface EmptyFolderEntry {
  path: string;
  root: ScanRootKey;
  mtimeMs: number;
}
