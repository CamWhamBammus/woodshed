"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TrashConfirmModal } from "@/components/ui/TrashConfirmModal";
import type { EmptyFolderEntry, ScanRootKey } from "@/types";

const ROOT_LABELS: Record<ScanRootKey, string> = {
  code: "Code",
  downloads: "Downloads",
  desktop: "Desktop",
};

export function EmptyFoldersView() {
  const [entries, setEntries] = useState<EmptyFolderEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setNotice(null);
    try {
      const { entries } = await api.scanEmptyFolders();
      setEntries(entries);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runScan();
  }, []);

  const selectedEntries = (entries ?? [])
    .filter((e) => selected.has(e.path))
    .map((e) => ({ path: e.path, sizeBytes: 0 }));

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleAll() {
    if (!entries) return;
    setSelected((prev) => (prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.path))));
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
          : `Moved ${okPaths.size} folder${okPaths.size === 1 ? "" : "s"} to Trash.`
      );
    } finally {
      setTrashing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-canopy-900">Empty Folder Sweep</h1>
          <p className="mt-1 text-sm text-charcoal-600">
            Directories with nothing in them, anywhere under Code, Downloads, or Desktop — including folders that
            only contain other empty folders.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={runScan} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Scanning…" : "Rescan"}
        </Button>
      </div>

      {notice && (
        <div className="mt-4 rounded-md border border-moss-600/25 bg-moss-600/8 px-4 py-2.5 text-sm text-moss-600">
          {notice}
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-walnut-500/15 bg-parchment-paper px-4 py-3 shadow-soft">
          <div className="text-sm text-charcoal-600">
            <span className="font-medium text-canopy-900">{entries.length}</span> empty folder
            {entries.length === 1 ? "" : "s"}
          </div>
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
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-walnut-500/15 bg-parchment-paper shadow-soft">
        {loading && !entries ? (
          <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">Looking for empty folders…</p>
        ) : entries && entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">
            None found. Nothing empty under Code, Downloads, or Desktop.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-walnut-500/10 text-left text-xs text-charcoal-600/60">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!entries && entries.length > 0 && selected.size === entries.length}
                    onChange={toggleAll}
                    className="accent-moss-600"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">Root</th>
                <th className="px-3 py-2 font-medium">Modified</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((entry) => (
                <tr
                  key={entry.path}
                  className={cn(
                    "border-b border-walnut-500/8 last:border-b-0 hover:bg-canopy-800/5",
                    selected.has(entry.path) && "bg-moss-600/6"
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(entry.path)}
                      onChange={() => toggle(entry.path)}
                      className="accent-moss-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="block truncate text-charcoal-800" title={entry.path}>
                      {entry.path}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded bg-tan-400/25 px-2 py-0.5 text-xs text-walnut-700">
                      {ROOT_LABELS[entry.root]}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-charcoal-600/70">
                    {entry.mtimeMs ? formatDistanceToNow(entry.mtimeMs, { addSuffix: true }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
