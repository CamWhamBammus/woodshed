import { NextResponse } from "next/server";
import { SCAN_ROOTS, type ScanRootKey } from "@/lib/paths";
import { undoLastRun } from "@/lib/organize";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rootKey = body?.root as ScanRootKey | undefined;

  if (!rootKey || !["downloads", "desktop"].includes(rootKey) || !(rootKey in SCAN_ROOTS)) {
    return NextResponse.json({ error: "root must be one of: downloads, desktop" }, { status: 400 });
  }

  const result = await undoLastRun(rootKey);
  return NextResponse.json(result);
}
