"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: "md" | "lg" | "xl";
}

const widths = { md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

export function Modal({ open, onClose, title, children, width = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-canopy-950/40 backdrop-blur-[2px] transition-opacity duration-150"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full rounded-lg border border-walnut-500/15 bg-parchment-paper shadow-lifted",
          "max-h-[85vh] overflow-y-auto",
          widths[width]
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-walnut-500/12 bg-parchment-paper px-5 py-4">
          <h2 className="font-serif text-lg text-canopy-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-charcoal-600 hover:bg-canopy-800/8 hover:text-canopy-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
