/**
 * PHASE 5 — guestlist API tests (upload, spoofing, duplicates, rate limit).
 *
 * Runs against a production build of the app:
 *
 *   npm run build
 *   npm start -- -p 3100
 *   npm run qa:api
 *
 * Creates one temporary event, uploads temporary objects and removes everything
 * at the end. Requires the real SUPABASE_SECRET_KEY in .env.local.
 */

const BASE = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3100").replace(
  /\/+$/,
  "",
);
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const MAX_MB = Number(process.env.GUESTLIST_MAX_FILE_MB ?? "5") || 5;
const BUCKET = "guestlist-proofs";
const STAMP = Date.now();

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.includes("your_key_here")) {
  console.error(
    "qa:api needs NEXT_PUBLIC_SUPABASE_URL and the real SUPABASE_SECRET_KEY in .env.local.",
  );
  process.exit(1);
}

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const TEXT_BYTES = Buffer.from("this is definitely not an image");

const results = [];
const cleanup = {
  eventIds: [],
  guestlistIds: [],
  objects: new Set(),
};

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

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function app(path, body, headers = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data,
    retryAfter: response.headers.get("retry-after"),
    cacheControl: response.headers.get("cache-control"),
  };
}

async function createEvent(overrides) {
  const response = await serviceRest("events", {
    method: "POST",
    body: {
      name: `QA API ${STAMP}`,
      slug: `qa-api-${STAMP}-${Math.random().toString(36).slice(2, 7)}`,
      event_date: new Date(Date.now() + 30 * 864e5).toISOString(),
      is_published: true,
      registration_open: true,
      ...overrides,
    },
    prefer: "return=representation",
  });
  const event = response.data?.[0];

  if (!event?.id) {
    throw new Error(`Could not create QA event: ${JSON.stringify(response.data)}`);
  }

  cleanup.eventIds.push(event.id);

  return event;
}

async function requestUploadUrl(
  event,
  mimeType = "image/png",
  size = PNG_1X1.length,
  ip,
) {
  return app(
    "/api/guestlist/upload-url",
    {
      eventId: event.id,
      guestlistToken: event.guestlist_token,
      slot: "story",
      mimeType,
      size,
    },
    ip ? { "x-forwarded-for": ip } : {},
  );
}

async function uploadToSignedUrl(path, token, bytes, mimeType = "image/png") {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(token)}`,
    {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: bytes,
    },
  );

  cleanup.objects.add(path);

  return { status: response.status, text: await response.text() };
}

/** Returns a path/token pair for a real 1x1 PNG or spoofed text bytes. */
async function uploadProof(event, bytes = PNG_1X1, mimeType = "image/png", ip) {
  const target = await requestUploadUrl(event, mimeType, bytes.length, ip);

  if (target.status !== 200 || !target.data?.data?.path) {
    throw new Error(`upload-url failed: ${JSON.stringify(target.data)}`);
  }

  const { path, token } = target.data.data;
  const upload = await uploadToSignedUrl(path, token, bytes, mimeType);

  if (upload.status >= 300) {
    throw new Error(`signed upload failed: ${upload.status} ${upload.text}`);
  }

  return path;
}

function submission(event, overrides) {
  return {
    eventId: event.id,
    guestlistToken: event.guestlist_token,
    submissionKey: crypto.randomUUID(),
    fullName: "QA API Guest",
    instagram: `qa.api.${Math.random().toString(36).slice(2, 10)}`,
    referencePerson: "QA",
    ...overrides,
  };
}

async function removeStorageObjects() {
  const prefixes = [...cleanup.objects];

  if (prefixes.length === 0) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes }),
  });
  const text = await response.text();

  if (response.status >= 300) {
    console.error(`storage cleanup failed: ${response.status} ${text}`);
  }
}

async function runCleanup() {
  console.log("\nCleaning up QA data…");

  for (const id of cleanup.guestlistIds) {
    await serviceRest(`guestlist?id=eq.${id}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  }

  for (const id of cleanup.eventIds) {
    await serviceRest(`events?id=eq.${id}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  }

  await removeStorageObjects();
  console.log("Cleanup done.");
}

try {
  const event = await createEvent({});

  // 1. Reject unsupported MIME type.
  const badMime = await requestUploadUrl(event, "image/svg+xml");
  record(
    "upload-url rejects SVG",
    badMime.status === 400 && badMime.data?.error?.code === "validation_error",
    `status ${badMime.status}, code ${badMime.data?.error?.code}`,
  );

  // 2. Reject oversized images before issuing a signed URL.
  const oversized = await requestUploadUrl(
    event,
    "image/png",
    MAX_MB * 1024 * 1024 + 1,
  );
  record(
    "upload-url rejects files above the size limit",
    oversized.status === 400,
    `status ${oversized.status}`,
  );

  // 3. Accept a valid request and return a server-owned path.
  const validTarget = await requestUploadUrl(event);
  const targetPath = validTarget.data?.data?.path ?? "";
  const pathPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/;
  record(
    "upload-url issues a server-owned path",
    validTarget.status === 200 &&
      pathPattern.test(targetPath) &&
      Boolean(validTarget.data?.data?.token),
    `status ${validTarget.status}, path ${targetPath.slice(0, 20)}…`,
  );

  // 4. Path traversal / foreign event paths are rejected by validation.
  const traversal = await app(
    "/api/guestlist",
    submission(event, {
      storyProofPath: "../../etc/passwd",
      commentProofPath: `${event.id}/${crypto.randomUUID()}.png`,
    }),
  );
  record(
    "submit rejects path traversal",
    traversal.status === 400 &&
      traversal.data?.error?.code === "validation_error",
    `status ${traversal.status}`,
  );

  // 5. Spoofed MIME: storage accepts the declared type, magic bytes reject it.
  const spoofStory = await uploadProof(event, TEXT_BYTES, "image/png");
  const spoofComment = await uploadProof(event);
  const spoofed = await app(
    "/api/guestlist",
    submission(event, {
      storyProofPath: spoofStory,
      commentProofPath: spoofComment,
    }),
  );
  record(
    "submit rejects spoofed image content (magic bytes)",
    spoofed.status === 400 && spoofed.data?.error?.code === "proof_invalid",
    `status ${spoofed.status}, code ${spoofed.data?.error?.code}`,
  );

  // 6. Happy path.
  const story = await uploadProof(event);
  const comment = await uploadProof(event);
  const validBody = submission(event, {
    storyProofPath: story,
    commentProofPath: comment,
  });
  const accepted = await app("/api/guestlist", validBody);
  record(
    "submit accepts a valid registration as pending",
    accepted.status === 200 &&
      accepted.data?.ok === true &&
      accepted.data?.data?.status === "pending",
    `status ${accepted.status}, status ${accepted.data?.data?.status}`,
  );
  record(
    "API responses are not cached",
    accepted.cacheControl?.includes("no-store") === true,
    `cache-control ${accepted.cacheControl}`,
  );

  if (accepted.data?.data?.id) {
    cleanup.guestlistIds.push(accepted.data.data.id);
  }

  // 7. Same submission key is idempotent (network retry).
  const retryStory = await uploadProof(event);
  const retryComment = await uploadProof(event);
  const retried = await app(
    "/api/guestlist",
    submission(event, {
      submissionKey: validBody.submissionKey,
      instagram: validBody.instagram,
      storyProofPath: retryStory,
      commentProofPath: retryComment,
    }),
  );
  record(
    "retry with the same submission key returns the original row",
    retried.status === 200 &&
      retried.data?.data?.id === accepted.data?.data?.id,
    `status ${retried.status}, id match ${retried.data?.data?.id === accepted.data?.data?.id}`,
  );

  // 8. Duplicate Instagram for the same event is rejected.
  const dupStory = await uploadProof(event);
  const dupComment = await uploadProof(event);
  const duplicate = await app(
    "/api/guestlist",
    submission(event, {
      instagram: validBody.instagram,
      storyProofPath: dupStory,
      commentProofPath: dupComment,
    }),
  );
  record(
    "duplicate Instagram on the same event is rejected",
    duplicate.status === 409 &&
      duplicate.data?.error?.code === "duplicate_instagram",
    `status ${duplicate.status}, code ${duplicate.data?.error?.code}`,
  );

  // 9. Closed registration.
  const closed = await createEvent({ registration_open: false });
  const closedUpload = await requestUploadUrl(closed);
  record(
    "closed registration refuses upload URLs",
    closedUpload.status === 409 &&
      closedUpload.data?.error?.code === "event_unavailable",
    `status ${closedUpload.status}`,
  );

  // 10. Expired event.
  const expired = await createEvent({
    event_date: new Date(Date.now() - 864e5).toISOString(),
  });
  const expiredUpload = await requestUploadUrl(expired);
  record(
    "past events refuse upload URLs",
    expiredUpload.status === 409,
    `status ${expiredUpload.status}`,
  );

  // 11. Wrong guestlist token.
  const wrongToken = await app("/api/guestlist/upload-url", {
    eventId: event.id,
    guestlistToken: crypto.randomUUID(),
    slot: "story",
    mimeType: "image/png",
    size: PNG_1X1.length,
  });
  record(
    "wrong guestlist token is refused",
    wrongToken.status === 409,
    `status ${wrongToken.status}`,
  );

  // 12. JSON body larger than 16 KB is refused.
  const oversizedBody = await app("/api/guestlist", {
    ...submission(event, {}),
    padding: "x".repeat(17_000),
  });
  record(
    "oversized JSON bodies are refused",
    oversizedBody.status === 400,
    `status ${oversizedBody.status}`,
  );

  // 13. Upload limiter: 10 signed URLs per 10 minutes per IP hash.
  // A simulated forwarded IP keeps this isolated from the earlier calls.
  const uploadIp = "198.51.100.10";
  const uploadStatuses = [];

  for (let index = 0; index < 11; index += 1) {
    const issued = await requestUploadUrl(
      event,
      "image/png",
      PNG_1X1.length,
      uploadIp,
    );
    uploadStatuses.push(issued.status);

    if (issued.status === 429) {
      record(
        "eleventh upload-url in the window is rate limited",
        index === 10 &&
          issued.data?.error?.code === "rate_limited" &&
          Boolean(issued.retryAfter),
        `call ${index + 1}, status ${issued.status}, retry-after ${issued.retryAfter}`,
      );
    }
  }

  record(
    "upload limiter allows ten signed URLs",
    uploadStatuses.slice(0, 10).every((status) => status === 200),
    `statuses ${uploadStatuses.slice(0, 10).join(",")}`,
  );

  // 14. Submit limiter: 5 registrations per hour per IP hash.
  const submitIp = "198.51.100.20";
  const proofIp = "198.51.100.30";
  const pairs = [];

  for (let index = 0; index < 5; index += 1) {
    const pairStory = await uploadProof(event, PNG_1X1, "image/png", proofIp);
    const pairComment = await uploadProof(event, PNG_1X1, "image/png", proofIp);

    pairs.push([pairStory, pairComment]);
  }

  const submitStatuses = [];
  let limited = null;

  for (let index = 0; index < 6; index += 1) {
    const [pairStory, pairComment] = pairs[Math.min(index, pairs.length - 1)];
    const attempt = await app(
      "/api/guestlist",
      submission(event, {
        instagram: `qa.limit.${index}.${STAMP}`.slice(0, 30),
        storyProofPath: pairStory,
        commentProofPath: pairComment,
      }),
      { "x-forwarded-for": submitIp },
    );

    submitStatuses.push(attempt.status);

    if (attempt.status === 429) {
      limited = attempt;
    } else if (attempt.status === 200 && attempt.data?.data?.id) {
      cleanup.guestlistIds.push(attempt.data.data.id);
    }
  }

  record(
    "submit limiter allows five registrations",
    submitStatuses.slice(0, 5).every((status) => status === 200),
    `statuses ${submitStatuses.join(",")}`,
  );
  record(
    "sixth submission in the window is rate limited",
    limited?.status === 429 &&
      limited?.data?.error?.code === "rate_limited" &&
      Boolean(limited?.retryAfter),
    `status ${limited?.status}, retry-after ${limited?.retryAfter}`,
  );

  // 14. Method not allowed on the API routes.
  const getUpload = await fetch(`${BASE}/api/guestlist/upload-url`);
  record(
    "GET on upload-url is not allowed",
    getUpload.status === 405,
    `status ${getUpload.status}`,
  );
} catch (error) {
  console.error("\nFATAL:", error);
  record("test run completed without fatal error", false, String(error));
} finally {
  await runCleanup();
}

const failed = results.filter((result) => !result.pass);

console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

if (failed.length > 0) {
  console.log("\nFailures:");
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
  await fs.writeFile("docs/qa-api-results.md", `${lines.join("\n")}\n`, "utf8");
  console.log("\nWrote docs/qa-api-results.md");
}
