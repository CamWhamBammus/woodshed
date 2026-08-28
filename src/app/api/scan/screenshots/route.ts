import { NextResponse } from "next/server";
import { findScreenshots, hasUndoableFileRun } from "@/lib/screenshots";

export async function POST() {
  const entries = await findScreenshots();
  return NextResponse.json({ entries, canUndo: hasUndoableFileRun() });
}
