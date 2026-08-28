import { NextResponse } from "next/server";
import { SCAN_ROOTS, type ScanRootKey } from "@/lib/paths";
import { previewOrganize, getLastRun } from "@/lib/organize";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rootKey = body?.root as ScanRootKey | undefined;

  if (!rootKey || !["downloads", "desktop"].includes(rootKey) || !(rootKey in SCAN_ROOTS)) {
    return NextResponse.json({ error: "root must be one of: downloads, desktop" }, { status: 400 });
  }

  const plan = await previewOrganize(rootKey);
  const lastRun = getLastRun(rootKey);
  return NextResponse.json({ plan, canUndo: !!lastRun });
}
