import { NextResponse } from "next/server";
import { SCAN_ROOTS, type ScanRootKey } from "@/lib/paths";
import { scanReport } from "@/lib/scanner";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rootKey = body?.root as ScanRootKey | undefined;

  if (!rootKey || !(rootKey in SCAN_ROOTS)) {
    return NextResponse.json({ error: "root must be one of: code, downloads, desktop" }, { status: 400 });
  }

  const result = await scanReport(SCAN_ROOTS[rootKey]);
  return NextResponse.json(result);
}
