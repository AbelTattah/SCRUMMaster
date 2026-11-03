import { NextResponse } from "next/server";

import { runDigest } from "@/lib/notify";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = ["1", "true", "yes"].includes(
    (url.searchParams.get("dryRun") ?? url.searchParams.get("dry") ?? "").toLowerCase(),
  );
  const user = url.searchParams.get("user") ?? undefined;

  const result = await runDigest({ user, dryRun });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
