"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/utils";

export function TrashConfirmModal({
  open,
  onClose,
  onConfirm,
  items,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: { path: string; sizeBytes: number }[];
  busy: boolean;
}) {
  const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0);

  return (
    <Modal open={open} onClose={onClose} title="Move to Trash?" width="lg">
      <div className="flex items-start gap-3 rounded-md border border-clay-500/25 bg-clay-500/8 p-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-clay-500" />
        <p className="text-sm text-charcoal-800">
          {items.length} item{items.length === 1 ? "" : "s"} ({formatBytes(totalBytes)}) will move to the macOS
          Trash. Nothing is permanently deleted — you can restore from Trash until you empty it.
        </p>
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-walnut-500/12">
        {items.map((item) => (
          <div
            key={item.path}
            className="flex items-center justify-between gap-3 border-b border-walnut-500/8 px-3 py-2 text-sm last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate text-charcoal-800" title={item.path}>
              {item.path}
            </span>
            <span className="shrink-0 text-xs text-charcoal-600/60">{formatBytes(item.sizeBytes)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Moving to Trash…" : `Move ${items.length} to Trash`}
        </Button>
      </div>
    </Modal>
  );
}
