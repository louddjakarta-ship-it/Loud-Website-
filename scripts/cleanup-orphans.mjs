/**
 * Deletes guestlist proof files that are not referenced by any guestlist row
 * and are older than 24 hours.
 *
 * Usage:
 *   npm run cleanup:orphans -- --dry-run
 *   npm run cleanup:orphans
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
 * The service-role key is required to list and remove private bucket objects.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "guestlist-proofs";
const RETENTION_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Run with: npm run cleanup:orphans",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

async function fetchReferencedPaths() {
  const referenced = new Set();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("guestlist")
      .select("story_proof_path, comment_proof_path")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read guestlist rows: ${error.message}`);
    }

    for (const row of data ?? []) {
      referenced.add(row.story_proof_path);
      referenced.add(row.comment_proof_path);
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return referenced;
}

async function listFolder(folder) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: PAGE_SIZE });

  if (error) {
    throw new Error(`Could not list ${folder}: ${error.message}`);
  }

  return data ?? [];
}

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const referenced = await fetchReferencedPaths();
  const { data: root, error } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: PAGE_SIZE });

  if (error) {
    throw new Error(`Could not list bucket root: ${error.message}`);
  }

  const orphans = [];
  let scanned = 0;

  for (const entry of root ?? []) {
    // Folder entries have no object id. Proof paths are always
    // `{event_id}/{file}`.
    if (entry.id) {
      continue;
    }

    const folder = entry.name;
    const files = await listFolder(folder);

    for (const file of files) {
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

  console.log(
    `Scanned ${scanned} proof file(s). Found ${orphans.length} orphan(s).`,
  );

  if (orphans.length === 0) {
    return;
  }

  if (dryRun) {
    console.log("Dry run — nothing deleted. Orphans:");
    for (const path of orphans) {
      console.log(`  ${path}`);
    }
    return;
  }

  for (let index = 0; index < orphans.length; index += 100) {
    const batch = orphans.slice(index, index + 100);
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(batch);

    if (removeError) {
      throw new Error(`Could not remove orphan batch: ${removeError.message}`);
    }

    console.log(`Deleted ${batch.length} orphan file(s).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
