import { NextResponse } from "next/server";
import { SCAN_ROOTS } from "@/lib/paths";
import { findDevJunk } from "@/lib/scanner";

export async function POST() {
  const entries = await findDevJunk(SCAN_ROOTS.code);
  const totalBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
  return NextResponse.json({ entries, totalBytes });
}
