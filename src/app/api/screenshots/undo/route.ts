import { NextResponse } from "next/server";
import { undoLastFileRun } from "@/lib/screenshots";

export async function POST() {
  const result = await undoLastFileRun();
  return NextResponse.json(result);
}
