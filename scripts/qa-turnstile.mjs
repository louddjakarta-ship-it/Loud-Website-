/**
 * PHASE 5 — Turnstile enforcement.
 *
 * Start a second production server with a failing Cloudflare test secret:
 *
 *   TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AA \
 *     npm start -- -p 3101
 *
 * Then run:
 *
 *   QA_BASE_URL=http://127.0.0.1:3101 node --env-file=.env.local scripts/qa-turnstile.mjs
 *
 * Cloudflare's `2x…` test secret always fails, so a token is either missing or
 * rejected. QA data is removed afterwards.
 */

const BASE = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3101").replace(
  /\/+$/,
  "",
);
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const STAMP = Date.now();
const IP = "198.51.100.99";

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.includes("your_key_here")) {
  console.error("Missing Supabase environment values in .env.local.");
  process.exit(1);
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const results = [];
const cleanup = { eventId: null, guestlistIds: [], objects: new Set() };

function record(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function serviceRest(path, { method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: SECRET_KEY,
    Authorization: `Bearer ${SECRET_KEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
  };
}

async function app(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": IP,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();

  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function uploadProof(event) {
  const target = await app("/api/guestlist/upload-url", {
    eventId: event.id,
    guestlistToken: event.guestlist_token,
    slot: "story",
    mimeType: "image/png",
    size: PNG.length,
  });

  if (target.status !== 200) {
    throw new Error(`upload-url failed: ${JSON.stringify(target.data)}`);
  }

  const { path, token } = target.data.data;
  const upload = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/guestlist-proofs/${path}?token=${encodeURIComponent(token)}`,
    { method: "PUT", headers: { "Content-Type": "image/png" }, body: PNG },
  );

  cleanup.objects.add(path);

  if (upload.status >= 300) {
    throw new Error(`signed upload failed: ${upload.status} ${await upload.text()}`);
  }

  return path;
}

async function submit(event, overrides) {
  return app("/api/guestlist", {
    eventId: event.id,
    guestlistToken: event.guestlist_token,
    submissionKey: crypto.randomUUID(),
    fullName: "QA Turnstile Guest",
    instagram: `qa.turnstile.${STAMP}.${Math.random().toString(36).slice(2, 6)}`.slice(0, 30),
    referencePerson: "QA",
    ...overrides,
  });
}

try {
  const created = await serviceRest("events", {
    method: "POST",
    body: {
      name: `QA Turnstile ${STAMP}`,
      slug: `qa-turnstile-${STAMP}`,
      event_date: new Date(Date.now() + 30 * 864e5).toISOString(),
      is_published: true,
      registration_open: true,
    },
    prefer: "return=representation",
  });
  const event = created.data?.[0];
  if (!event) throw new Error("Could not create QA event");
  cleanup.eventId = event.id;

  // 1. Missing token is rejected.
  const missingStory = await uploadProof(event);
  const missingComment = await uploadProof(event);
  const missing = await submit(event, {
    storyProofPath: missingStory,
    commentProofPath: missingComment,
  });
  record(
    "missing Turnstile token is rejected",
    missing.status === 400 &&
      missing.data?.error?.code === "turnstile_failed",
    `status ${missing.status}, code ${missing.data?.error?.code}`,
  );

  // 2. Invalid token is rejected by siteverify.
  const invalidStory = await uploadProof(event);
  const invalidComment = await uploadProof(event);
  const invalid = await submit(event, {
    storyProofPath: invalidStory,
    commentProofPath: invalidComment,
    turnstileToken: "qa-invalid-token",
  });
  record(
    "invalid Turnstile token is rejected",
    invalid.status === 400 &&
      invalid.data?.error?.code === "turnstile_failed",
    `status ${invalid.status}, code ${invalid.data?.error?.code}`,
  );

  // 3. Rejected attempts must not leave proof objects behind.
  const orphans = [...cleanup.objects];
  let remaining = 0;

  for (const path of orphans) {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/guestlist-proofs/${path}`,
      {
        headers: {
          apikey: SECRET_KEY,
          Authorization: `Bearer ${SECRET_KEY}`,
        },
      },
    );

    if (response.status === 200) {
      remaining += 1;
    }
  }

  record(
    "rejected Turnstile attempts clean up their uploads",
    remaining === 0,
    `${remaining} orphan object(s)`,
  );
} catch (error) {
  console.error("FATAL:", error);
  record("test run completed without fatal error", false, String(error));
} finally {
  console.log("\nCleaning up QA data…");

  for (const id of cleanup.guestlistIds) {
    await serviceRest(`guestlist?id=eq.${id}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  }

  if (cleanup.eventId) {
    await serviceRest(`events?id=eq.${cleanup.eventId}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  }

  if (cleanup.objects.size > 0) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/guestlist-proofs`, {
      method: "DELETE",
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [...cleanup.objects] }),
    });
  }

  console.log("Cleanup done.");
}

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length > 0) {
  for (const failure of failed) {
    console.log(`- ${failure.name} (${failure.detail})`);
  }
  process.exitCode = 1;
}

if (process.env.QA_WRITE_DOCS === "1") {
  const lines = [
    "| # | Check | Result | Detail |",
    "|---|-------|--------|--------|",
    ...results.map(
      (result, index) =>
        `| ${index + 1} | ${result.name} | ${result.pass ? "PASS" : "FAIL"} | ${result.detail.replace(/\|/g, "\\|")} |`,
    ),
  ];
  const fs = await import("node:fs/promises");
  await fs.writeFile("docs/qa-turnstile-results.md", `${lines.join("\n")}\n`, "utf8");
  console.log("\nWrote docs/qa-turnstile-results.md");
}
