import { NextResponse } from "next/server";
import { SCAN_ROOTS } from "@/lib/paths";
import { findGitRepos } from "@/lib/gitRepos";

export async function POST() {
  const entries = await findGitRepos(SCAN_ROOTS.code);
  return NextResponse.json({ entries });
}
