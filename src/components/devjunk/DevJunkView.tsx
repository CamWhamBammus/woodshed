"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api-client";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TrashConfirmModal } from "@/components/ui/TrashConfirmModal";
import type { JunkEntry } from "@/types";

export function DevJunkView() {
  const [entries, setEntries] = useState<JunkEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setNotice(null);
    try {
      const { entries } = await api.scanDevJunk();
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

  function toggleAll() {
    if (!entries) return;
    setSelected((prev) => (prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.path))));
  }

  async function handleTrash() {
    setTrashing(true);
    try {
      const { results } = await api.trash(selectedEntries.map((e) => e.path));
      const okPaths = new Set(results.filter((r) => r.ok).length ? results.filter((r) => r.ok).map((r) => r.path) : []);
      const failed = results.filter((r) => !r.ok);
      setEntries((prev) => (prev ?? []).filter((e) => !okPaths.has(e.path)));
      setSelected(new Set());
      setConfirmOpen(false);
      if (failed.length > 0) {
        setNotice(`Moved ${okPaths.size} to Trash. ${failed.length} couldn't be moved: ${failed[0].error}`);
      } else {
        setNotice(`Moved ${okPaths.size} item${okPaths.size === 1 ? "" : "s"} to Trash.`);
      }
    } finally {
      setTrashing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-canopy-900">Dev Junk</h1>
          <p className="mt-1 text-sm text-charcoal-600">
            Regenerable build junk under <code className="text-xs">~/Organized/Code</code> — node_modules,
            venvs, build caches. Everything here comes back with a reinstall.
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
            <span className="font-medium text-canopy-900">{entries.length}</span> items ·{" "}
            <span className="font-medium text-canopy-900">{formatBytes(totalBytes)}</span> reclaimable
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
          <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">Scanning your Code folder…</p>
        ) : entries && entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">
            Nothing found. Your Code folder is clean.
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
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Modified</th>
                <th className="px-3 py-2 text-right font-medium">Size</th>
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
                    <span
                      className="inline-flex items-center rounded bg-tan-400/25 px-2 py-0.5 text-xs text-walnut-700"
                      title={entry.hint}
                    >
                      {entry.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-charcoal-600/70">
                    {entry.mtimeMs ? formatDistanceToNow(entry.mtimeMs, { addSuffix: true }) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-charcoal-800">
                    {formatBytes(entry.sizeBytes)}
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
