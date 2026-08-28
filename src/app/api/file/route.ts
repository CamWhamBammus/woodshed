import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { assertPathIsSafeToTouch, UnsafePathError } from "@/lib/trash";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// GET, not POST like every other route here — this one has to be
// <img src>-able, and it's a pure read with no side effects, which is
// exactly what GET is for.
export async function GET(req: Request) {
  const targetPath = new URL(req.url).searchParams.get("path");
  if (!targetPath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    assertPathIsSafeToTouch(targetPath);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return NextResponse.json({ error: "Refused" }, { status: 403 });
    }
    throw err;
  }

  const mime = MIME[path.extname(targetPath).toLowerCase()];
  if (!mime) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 403 });
  }

  let stat;
  try {
    stat = fs.statSync(targetPath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = await fsp.readFile(targetPath);
  return new NextResponse(buf, {
    headers: { "Content-Type": mime, "Cache-Control": "private, max-age=300" },
  });
}
