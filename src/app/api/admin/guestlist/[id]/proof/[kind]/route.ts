import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/auth/admin";
import { PROOF_BUCKET } from "@/lib/storage/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.uuid();

/**
 * Redirects an authorized admin to a 60-second signed URL for one proof.
 * The storage path never leaves the server.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const admin = await getAdminSession();

  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id, kind } = await params;
  const parsedId = idSchema.safeParse(id);

  if (!parsedId.success || (kind !== "story" && kind !== "comment")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: row, error } = await supabase
    .from("guestlist")
    .select("story_proof_path,comment_proof_path")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error || !row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const path =
    kind === "story" ? row.story_proof_path : row.comment_proof_path;

  const { data: signed, error: signError } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, 60);

  if (signError || !signed?.signedUrl) {
    console.error("[admin/proof] signed url failed", {
      code: signError?.name ?? "unknown",
    });

    return new NextResponse("Proof unavailable", { status: 404 });
  }

  const response = NextResponse.redirect(signed.signedUrl, 302);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");

  return response;
}
