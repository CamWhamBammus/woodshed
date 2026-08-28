"use client";

import { useEffect, useState } from "react";
import { FolderTree, RefreshCw, Undo2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type RootKey = "downloads" | "desktop";

const TABS: { key: RootKey; label: string }[] = [
  { key: "downloads", label: "Downloads" },
  { key: "desktop", label: "Desktop" },
];

interface PlanItem {
  category: string;
  files: { name: string; from: string; to: string }[];
}

export function OrganizeView() {
  const [rootKey, setRootKey] = useState<RootKey>("downloads");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    setNotice(null);
    try {
      const { plan, canUndo } = await api.organizePreview(rootKey);
      setItems(plan.items);
      setUncategorizedCount(plan.uncategorizedCount);
      setCanUndo(canUndo);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootKey]);

  const totalFiles = items.reduce((sum, i) => sum + i.files.length, 0);

  async function handleApply() {
    setApplying(true);
    try {
      const { moved, skipped } = await api.organizeApply(rootKey);
      setConfirmOpen(false);
      setNotice(
        `Moved ${moved} file${moved === 1 ? "" : "s"} into folders.${skipped ? ` Skipped ${skipped} (already existed at the destination).` : ""}`
      );
      await loadPreview();
    } finally {
      setApplying(false);
    }
  }

  async function handleUndo() {
    setUndoing(true);
    try {
      const { restored } = await api.organizeUndo(rootKey);
      setNotice(`Restored ${restored} file${restored === 1 ? "" : "s"} to where they were.`);
      await loadPreview();
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-canopy-900">Organize</h1>
          <p className="mt-1 text-sm text-charcoal-600">
            Sorts loose files into subfolders by type. Only moves files — never touches folders or app bundles.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadPreview} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Rescan
        </Button>
      </div>

      <div className="mt-6 flex gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRootKey(tab.key)}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              rootKey === tab.key
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

      <div className="mt-4 rounded-lg border border-walnut-500/15 bg-parchment-paper shadow-soft">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">Looking through {rootKey}…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-charcoal-600/50">
            Nothing to organize — no loose files matched a known category.
          </p>
        ) : (
          <div className="divide-y divide-walnut-500/8">
            {items.map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-canopy-900">
                    {item.category} <span className="font-normal text-charcoal-600/60">({item.files.length})</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-charcoal-600/60">
                    {item.files
                      .slice(0, 3)
                      .map((f) => f.name)
                      .join(", ")}
                    {item.files.length > 3 && ` +${item.files.length - 3} more`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-charcoal-600/50">→ {rootKey === "downloads" ? "Downloads" : "Desktop"}/{item.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {uncategorizedCount > 0 && (
        <p className="mt-3 text-xs text-charcoal-600/50">
          {uncategorizedCount} other file{uncategorizedCount === 1 ? "" : "s"} left alone (no matching category).
        </p>
      )}

      <div className="mt-6 flex items-center gap-2">
        <Button disabled={totalFiles === 0 || loading} onClick={() => setConfirmOpen(true)}>
          <FolderTree size={14} />
          Organize {totalFiles || ""} file{totalFiles === 1 ? "" : "s"}
        </Button>
        {canUndo && (
          <Button variant="secondary" onClick={handleUndo} disabled={undoing}>
            <Undo2 size={14} />
            {undoing ? "Undoing…" : "Undo last run"}
          </Button>
        )}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Organize these files?">
        <p className="text-sm text-charcoal-800">
          {totalFiles} file{totalFiles === 1 ? "" : "s"} will move into {items.length} subfolder
          {items.length === 1 ? "" : "s"} under {rootKey === "downloads" ? "Downloads" : "Desktop"}. This only
          relocates files — you can undo it afterward.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "Organizing…" : "Organize"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
