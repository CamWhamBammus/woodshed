"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TrashConfirmModal } from "@/components/ui/TrashConfirmModal";
import type { DuplicateGroup, FileEntry, ScanRootKey } from "@/types";

const TABS: { key: ScanRootKey; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "downloads", label: "Downloads" },
  { key: "desktop", label: "Desktop" },
];

// Matches "name copy.ext", "name copy 2.ext", "name (1).ext", "name 2.ext".
const DUPLICATE_MARKER = /(\s+copy(\s+\d+)?|\s+\(\d+\)|\s+\d+)\.[^./]+$/i;

/** Index of the path to keep: the first one whose filename doesn't look like a copy of another. */
function pickCanonicalIndex(paths: string[]): number {
  const canonical = paths.findIndex((p) => !DUPLICATE_MARKER.test(p));
  return canonical === -1 ? 0 : canonical;
}

export function DuplicatesView() {
  const [root, setRoot] = useState<ScanRootKey>("downloads");
  const [largestFiles, setLargestFiles] = useState<FileEntry[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [scannedFileCount, setScannedFileCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const sizeByPath = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of largestFiles) map.set(f.path, f.sizeBytes);
    for (const g of duplicateGroups) for (const p of g.paths) map.set(p, g.sizeBytes);
    return map;
  }, [largestFiles, duplicateGroups]);

  async function runScan() {
    setLoading(true);
    setNotice(null);
    try {
      const result = await api.scanReport(root);
      setLargestFiles(result.largestFiles);
      setDuplicateGroups(result.duplicateGroups);
      setScannedFileCount(result.scannedFileCount);
      // Pre-select all but one path per duplicate group — a "keep one,
      // trash the rest" default the user can adjust. The kept path is
      // whichever name does NOT look like a duplicate-of-something
      // ("copy", "(1)", " 2", etc.), not just whatever readdir() happened
      // to list first — plain alphabetical order actually sorts "foo
      // copy.mp4" *before* "foo.mp4" (space < period), so a naive
      // keep-the-first rule silently proposes trashing the real original
      // and keeping the copy. Verified against real Downloads clutter.
      const preselected = new Set<string>();
      for (const g of result.duplicateGroups) {
        const keepIndex = pickCanonicalIndex(g.paths);
        g.paths.forEach((p, i) => {
          if (i !== keepIndex) preselected.add(p);
        });
      }
      setSelected(preselected);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const selectedItems = [...selected].map((path) => ({ path, sizeBytes: sizeByPath.get(path) ?? 0 }));
  const wastedBytes = duplicateGroups.reduce((sum, g) => sum + g.sizeBytes * (g.paths.length - 1), 0);

  async function handleTrash() {
    setTrashing(true);
    try {
      const { results } = await api.trash(selectedItems.map((i) => i.path));
      const okPaths = new Set(results.filter((r) => r.ok).map((r) => r.path));
      const failed = results.filter((r) => !r.ok);
      setDuplicateGroups((prev) =>
        prev.map((g) => ({ ...g, paths: g.paths.filter((p) => !okPaths.has(p)) })).filter((g) => g.paths.length > 1)
      );
      setLargestFiles((prev) => prev.filter((f) => !okPaths.has(f.path)));
      setSelected(new Set());
      setConfirmOpen(false);
      setNotice(
        failed.length > 0
          ? `Moved ${okPaths.size} to Trash. ${failed.length} couldn't be moved: ${failed[0].error}`
          : `Moved ${okPaths.size} item${okPaths.size === 1 ? "" : "s"} to Trash.`
      );
    } finally {
      setTrashing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-canopy-900">Duplicates & Large Files</h1>
          <p className="mt-1 text-sm text-charcoal-600">
            A read-only look at where space is going — nothing moves until you select it and confirm.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={runScan} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Rescan
        </Button>
      </div>

      <div className="mt-6 flex gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoot(tab.key)}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              root === tab.key
                ? "bg-moss-600 text-parchment-50"
                : "bg-canopy-800/6 text-charcoal-600 hover:bg-canopy-800/12"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mt-4 rounded-md border border-moss-600/25 bg-moss-600/8 px-4 py-2.5 text-sm text-moss-600">
          {notice}
        </div>
      )}

      {!loading && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-walnut-500/15 bg-parchment-paper px-4 py-3 shadow-soft">
          <div className="text-sm text-charcoal-600">
            <span className="font-medium text-canopy-900">{scannedFileCount}</span> files scanned ·{" "}
            <span className="font-medium text-canopy-900">{formatBytes(wastedBytes)}</span> in duplicates
          </div>
          <Button variant="danger" size="sm" disabled={selected.size === 0} onClick={() => setConfirmOpen(true)}>
            <Trash2 size={14} />
            Move {selected.size || ""} to Trash
          </Button>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-charcoal-600/70 uppercase">
          <Copy size={12} />
          Duplicate groups
        </h2>
        <div className="rounded-lg border border-walnut-500/15 bg-parchment-paper shadow-soft">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">Hashing files in {root}…</p>
          ) : duplicateGroups.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-charcoal-600/50">No exact duplicates found.</p>
          ) : (
            <div className="divide-y divide-walnut-500/8">
              {duplicateGroups.map((group) => (
                <div key={group.paths[0]} className="px-4 py-3">
                  <p className="mb-1.5 text-xs text-charcoal-600/60">
                    {group.paths.length} copies · {formatBytes(group.sizeBytes)} each
                  </p>
                  {group.paths.map((p) => (
                    <label key={p} className="flex items-center gap-2 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(p)}
                        onChange={() => toggle(p)}
                        className="accent-moss-600"
                      />
                      <span className="min-w-0 flex-1 truncate text-charcoal-800" title={p}>
                        {p}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-medium tracking-wide text-charcoal-600/70 uppercase">Largest files</h2>
        <div className="rounded-lg border border-walnut-500/15 bg-parchment-paper shadow-soft">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">Scanning…</p>
          ) : largestFiles.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-charcoal-600/50">No files found.</p>
          ) : (
            <div className="divide-y divide-walnut-500/8">
              {largestFiles.slice(0, 20).map((f) => (
                <label key={f.path} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(f.path)}
                    onChange={() => toggle(f.path)}
                    className="accent-moss-600"
                  />
                  <span className="min-w-0 flex-1 truncate text-charcoal-800" title={f.path}>
                    {f.path}
                  </span>
                  <span className="shrink-0 text-xs text-charcoal-600/60">{formatBytes(f.sizeBytes)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </section>

      <TrashConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleTrash}
        items={selectedItems}
        busy={trashing}
      />
    </div>
  );
}
