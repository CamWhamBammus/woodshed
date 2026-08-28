import { NextResponse } from "next/server";
import { findEmptyFolders } from "@/lib/emptyFolders";

export async function POST() {
  const entries = await findEmptyFolders();
  return NextResponse.json({ entries });
}
