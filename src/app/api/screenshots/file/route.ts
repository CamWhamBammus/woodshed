import { NextResponse } from "next/server";
import { fileScreenshots } from "@/lib/screenshots";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const paths = body?.paths;

  if (!Array.isArray(paths) || paths.some((p) => typeof p !== "string") || paths.length === 0) {
    return NextResponse.json({ error: "paths must be a non-empty string array" }, { status: 400 });
  }

  const results = await fileScreenshots(paths);
  return NextResponse.json({ results });
}
