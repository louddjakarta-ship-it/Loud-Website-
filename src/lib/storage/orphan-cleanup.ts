import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Removes guestlist proof files that no `guestlist` row references.
 *
 * Proofs are uploaded before the submission row is created. If a submission
 * fails afterwards, the object stays in the bucket with no row pointing at it.
 * Objects younger than the retention window are always kept so an in-flight
 * submission is never deleted.
 *
 * The service-role client is required: `guestlist-proofs` is a private bucket
 * and `guestlist` rows are not readable with the publishable key.
 */

const BUCKET = "guestlist-proofs";
const RETENTION_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;

export type OrphanCleanupSummary = {
  scanned: number;
  orphans: number;
  deleted: number;
  dryRun: boolean;
};

async function fetchReferencedPaths(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
) {
  const referenced = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("guestlist")
      .select("story_proof_path, comment_proof_path")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read guestlist rows (${error.code}).`);
    }

    for (const row of data ?? []) {
      referenced.add(row.story_proof_path);
      referenced.add(row.comment_proof_path);
    }

    if (!data || data.length < PAGE_SIZE) {
      return referenced;
    }

    from += PAGE_SIZE;
  }
}

export async function cleanupOrphanProofs(
  options: { dryRun?: boolean } = {},
): Promise<OrphanCleanupSummary> {
  const dryRun = options.dryRun ?? false;
  const supabase = createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();

  const referenced = await fetchReferencedPaths(supabase);

  const { data: root, error: rootError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: PAGE_SIZE });

  if (rootError) {
    throw new Error("Could not list the proof bucket.");
  }

  const orphans: string[] = [];
  let scanned = 0;

  for (const entry of root ?? []) {
    // Folder entries have no object id. Proof paths are `{event_id}/{file}`.
    if (entry.id) {
      continue;
    }

    const folder = entry.name;
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(folder, { limit: PAGE_SIZE });

    if (listError) {
      throw new Error(`Could not list proof folder ${folder}.`);
    }

    for (const file of files ?? []) {
      if (!file.id) {
        continue;
      }

      scanned += 1;
      const path = `${folder}/${file.name}`;
      const createdAt = file.created_at ?? file.updated_at;

      if (referenced.has(path)) {
        continue;
      }

      if (createdAt && createdAt >= cutoff) {
        continue;
      }

      orphans.push(path);
    }
  }

  if (dryRun || orphans.length === 0) {
    return { scanned, orphans: orphans.length, deleted: 0, dryRun };
  }

  let deleted = 0;

  for (let index = 0; index < orphans.length; index += DELETE_BATCH_SIZE) {
    const batch = orphans.slice(index, index + DELETE_BATCH_SIZE);
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(batch);

    if (removeError) {
      throw new Error("Could not remove an orphan batch.");
    }

    deleted += batch.length;
  }

  return { scanned, orphans: orphans.length, deleted, dryRun };
}
