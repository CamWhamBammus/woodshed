"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2, Undo2, FolderInput } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api-client";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TrashConfirmModal } from "@/components/ui/TrashConfirmModal";
import type { ScreenshotEntry } from "@/types";

export function ScreenshotsView() {
  const [entries, setEntries] = useState<ScreenshotEntry[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [filing, setFiling] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setNotice(null);
    try {
      const { entries, canUndo } = await api.scanScreenshots();
      setEntries(entries);
      setCanUndo(canUndo);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runScan();
  }, []);

  const totalBytes = useMemo(() => (entries ?? []).reduce((sum, e) => sum + e.sizeBytes, 0), [entries]);
  const selectedEntries = (entries ?? []).filter((e) => selected.has(e.path));

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleFile() {
    setFiling(true);
    try {
      const { results } = await api.fileScreenshots(selectedEntries.map((e) => e.path));
      const okPaths = new Set(results.filter((r) => r.ok).map((r) => r.path));
      const failed = results.filter((r) => !r.ok);
      setEntries((prev) => (prev ?? []).filter((e) => !okPaths.has(e.path)));
      setSelected(new Set());
      if (okPaths.size > 0) setCanUndo(true);
      setNotice(
        failed.length > 0
          ? `Filed ${okPaths.size}. ${failed.length} couldn't be filed: ${failed[0].error}`
          : `Filed ${okPaths.size} screenshot${okPaths.size === 1 ? "" : "s"} into dated folders.`
      );
    } finally {
      setFiling(false);
    }
  }

  async function handleTrash() {
    setTrashing(true);
    try {
      const { results } = await api.trash(selectedEntries.map((e) => e.path));
      const okPaths = new Set(results.filter((r) => r.ok).map((r) => r.path));
      const failed = results.filter((r) => !r.ok);
      setEntries((prev) => (prev ?? []).filter((e) => !okPaths.has(e.path)));
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

  async function handleUndo() {
    setUndoing(true);
    try {
      const { restored } = await api.undoFileRun();
      setNotice(`Restored ${restored} screenshot${restored === 1 ? "" : "s"} to where they were.`);
      await runScan();
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-canopy-900">Screenshot Sweep</h1>
          <p className="mt-1 text-sm text-charcoal-600">
            Screenshots piled up on Desktop and Downloads. File them into dated folders or send them to Trash.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canUndo && (
            <Button variant="secondary" size="sm" onClick={handleUndo} disabled={undoing}>
              <Undo2 size={14} />
              {undoing ? "Undoing…" : "Undo last filing"}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={runScan} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Scanning…" : "Rescan"}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-md border border-moss-600/25 bg-moss-600/8 px-4 py-2.5 text-sm text-moss-600">
          {notice}
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-walnut-500/15 bg-parchment-paper px-4 py-3 shadow-soft">
          <div className="text-sm text-charcoal-600">
            <span className="font-medium text-canopy-900">{entries.length}</span> screenshots ·{" "}
            <span className="font-medium text-canopy-900">{formatBytes(totalBytes)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedEntries.length === 0 || filing}
              onClick={handleFile}
            >
              <FolderInput size={14} />
              {filing ? "Filing…" : `File ${selectedEntries.length || ""} into folders`}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={selectedEntries.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 size={14} />
              Move {selectedEntries.length || ""} to Trash
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading && !entries ? (
          <p className="rounded-lg border border-walnut-500/15 bg-parchment-paper px-4 py-8 text-center text-sm text-charcoal-600/50 shadow-soft">
            Scanning Desktop and Downloads…
          </p>
        ) : entries && entries.length === 0 ? (
          <p className="rounded-lg border border-walnut-500/15 bg-parchment-paper px-4 py-8 text-center text-sm text-charcoal-600/50 shadow-soft">
            No screenshots found. Desktop and Downloads are clean.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {(entries ?? []).map((entry) => {
              const isSelected = selected.has(entry.path);
              return (
                <button
                  key={entry.path}
                  onClick={() => toggle(entry.path)}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border bg-parchment-paper text-left shadow-soft transition-colors",
                    isSelected ? "border-moss-600 ring-2 ring-moss-600/40" : "border-walnut-500/15 hover:border-walnut-500/35"
                  )}
                >
                  <div className="aspect-video w-full overflow-hidden bg-canopy-800/5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- next/image can't optimize arbitrary absolute filesystem paths */}
                    <img
                      src={`/api/file?path=${encodeURIComponent(entry.path)}`}
                      alt={entry.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div
                    className={cn(
                      "absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected
                        ? "border-moss-600 bg-moss-600"
                        : "border-parchment-50 bg-canopy-950/30 group-hover:border-moss-600/70"
                    )}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-parchment-50" />}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-xs text-charcoal-800" title={entry.name}>
                      {entry.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-charcoal-600/60">
                      {format(entry.mtimeMs, "MMM d, yyyy")} · {formatBytes(entry.sizeBytes)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TrashConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleTrash}
        items={selectedEntries}
        busy={trashing}
      />
    </div>
  );
}
