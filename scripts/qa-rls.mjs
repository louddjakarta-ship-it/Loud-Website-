/**
 * PHASE 5 — Row Level Security & Storage test matrix.
 *
 * Runs against the configured Supabase project using the public (anon) key and
 * temporary QA users. Every QA row, object and auth user is removed at the end,
 * including on failure.
 *
 * Usage:
 *   npm run qa:rls
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and
 * SUPABASE_SECRET_KEY in .env.local.
 */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!URL_BASE || !PUBLIC_KEY || !SECRET_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY.",
  );
  process.exit(1);
}

const BASE = URL_BASE.replace(/\/+$/, "");
const STAMP = Date.now();
const PASSWORD = `Qa-${crypto.randomUUID()}`;
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const state = {
  users: [],
  events: [],
  guestlist: [],
  gallery: [],
  galleryObjects: [],
  proofObject: null,
  siteSettings: null,
};

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: detail ?? "" });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function denied(status, data) {
  if (status !== 401 && status !== 403) {
    return false;
  }

  const code = data && typeof data === "object" ? data.code : null;

  // PostgREST uses 42501 for missing privileges; RLS violations come back as
  // 42501 too. A bare 401 is also acceptable for the anon role.
  return code === "42501" || status === 401;
}

async function rest(
  path,
  { method = "GET", token = PUBLIC_KEY, key = PUBLIC_KEY, body, prefer } = {},
) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(`${BASE}/rest/v1/${path}`, {
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

async function storageRequest(path, { method = "GET", token, key, body, headers } = {}) {
  const response = await fetch(`${BASE}/storage/v1/${path}`, {
    method,
    headers: {
      apikey: key ?? token,
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });
  const text = await response.text();

  return { status: response.status, text };
}

async function createAuthUser(email) {
  const response = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(`Could not create QA user: ${JSON.stringify(data)}`);
  }

  return data.id;
}

async function signIn(email) {
  const response = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: PUBLIC_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Could not sign in QA user: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

const service = (path, options = {}) =>
  rest(path, { ...options, token: SECRET_KEY, key: SECRET_KEY });

async function cleanup() {
  console.log("\nCleaning up QA data…");

  try {
    if (state.siteSettings) {
      await service("site_settings?id=eq.true", {
        method: "PATCH",
        body: state.siteSettings,
        prefer: "return=minimal",
      });
    }

    if (state.proofObject) {
      await storageRequest("object/guestlist-proofs", {
        method: "DELETE",
        token: SECRET_KEY,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [state.proofObject] }),
      });
    }

    if (state.galleryObjects.length > 0) {
      await storageRequest("object/gallery-photos", {
        method: "DELETE",
        token: SECRET_KEY,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: state.galleryObjects }),
      });
    }

    if (state.gallery.length > 0) {
      await service(
        `gallery_photos?id=in.(${state.gallery.join(",")})`,
        { method: "DELETE", prefer: "return=minimal" },
      );
    }

    for (const id of state.guestlist) {
      await service(`guestlist?id=eq.${id}`, {
        method: "DELETE",
        prefer: "return=minimal",
      });
    }

    for (const id of state.events) {
      await service(`events?id=eq.${id}`, {
        method: "DELETE",
        prefer: "return=minimal",
      });
    }

    for (const user of state.users) {
      await service(`admin_profiles?id=eq.${user.id}`, {
        method: "DELETE",
        prefer: "return=minimal",
      });
    }

    for (const user of state.users) {
      await fetch(`${BASE}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          apikey: SECRET_KEY,
          Authorization: `Bearer ${SECRET_KEY}`,
        },
      });
    }

    console.log("Cleanup done.");
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

async function main() {
  const current = await service("site_settings?select=hero_tagline,hero_description");
  state.siteSettings = current.data?.[0] ?? null;

  // --- fixtures ------------------------------------------------------------
  const admin = await service("admin_profiles?select=id&limit=1");
  const createdBy = admin.data?.[0]?.id ?? null;

  const published = await service("events", {
    method: "POST",
    body: {
      name: `QA RLS published ${STAMP}`,
      slug: `qa-rls-published-${STAMP}`,
      event_date: new Date(Date.now() + 30 * 864e5).toISOString(),
      is_published: true,
      registration_open: true,
      created_by: createdBy,
    },
    prefer: "return=representation",
  });
  const draft = await service("events", {
    method: "POST",
    body: {
      name: `QA RLS draft ${STAMP}`,
      slug: `qa-rls-draft-${STAMP}`,
      event_date: new Date(Date.now() + 30 * 864e5).toISOString(),
      is_published: false,
      created_by: createdBy,
    },
    prefer: "return=representation",
  });

  const pub = published.data?.[0];
  const dra = draft.data?.[0];

  if (!pub || !dra) {
    throw new Error(
      `Could not create QA events: ${JSON.stringify(published.data)} ${JSON.stringify(draft.data)}`,
    );
  }

  state.events.push(pub.id, dra.id);

  // --- user fixtures -------------------------------------------------------
  const staffEmail = `qa-staff-${STAMP}@loudjakarta.test`;
  const superEmail = `qa-super-${STAMP}@loudjakarta.test`;
  const plainEmail = `qa-plain-${STAMP}@loudjakarta.test`;

  const staffId = await createAuthUser(staffEmail);
  state.users.push({ id: staffId, role: "staff" });
  const superId = await createAuthUser(superEmail);
  state.users.push({ id: superId, role: "super_admin" });
  const plainId = await createAuthUser(plainEmail);
  state.users.push({ id: plainId, role: "none" });

  await service("admin_profiles", {
    method: "POST",
    body: [
      {
        id: staffId,
        display_name: "QA Staff",
        role: "staff",
        is_active: true,
      },
      {
        id: superId,
        display_name: "QA Super",
        role: "super_admin",
        is_active: true,
      },
    ],
    prefer: "return=minimal",
  });

  const staffToken = await signIn(staffEmail);
  const superToken = await signIn(superEmail);
  const plainToken = await signIn(plainEmail);

  // --- guestlist fixture ---------------------------------------------------
  const proofPath = `${pub.id}/${crypto.randomUUID()}.png`;

  // Upload with an explicit path so cleanup can target it.
  const seededProof = await storageRequest(
    `object/guestlist-proofs/${proofPath}`,
    {
      method: "POST",
      token: SECRET_KEY,
      headers: { "Content-Type": "image/png", "x-upsert": "true" },
      body: PNG_1X1,
    },
  );

  if (seededProof.status >= 300) {
    throw new Error(`Could not seed proof object: ${seededProof.status}`);
  }

  state.proofObject = proofPath;

  const guestlistRow = await service("guestlist", {
    method: "POST",
    body: {
      submission_key: crypto.randomUUID(),
      event_id: pub.id,
      full_name: "QA Guestlist",
      instagram: `qa.guest.${STAMP}`.slice(0, 30),
      reference_person: "QA",
      story_proof_path: proofPath,
      comment_proof_path: proofPath,
    },
    prefer: "return=representation",
  });
  const guest = guestlistRow.data?.[0];

  if (!guest) {
    throw new Error(`Could not seed guestlist row: ${JSON.stringify(guestlistRow.data)}`);
  }

  state.guestlist.push(guest.id);

  // --- gallery fixture -----------------------------------------------------
  const galleryName = `${crypto.randomUUID()}.png`;
  const galleryUpload = await storageRequest(
    `object/gallery-photos/${galleryName}`,
    {
      method: "POST",
      token: SECRET_KEY,
      headers: { "Content-Type": "image/png", "x-upsert": "true" },
      body: PNG_1X1,
    },
  );

  if (galleryUpload.status >= 300) {
    throw new Error(`Could not seed gallery object: ${galleryUpload.status}`);
  }

  state.galleryObjects.push(galleryName);

  // ========================================================================
  // ANON
  // ========================================================================
  const anonEvents = await rest(
    `events?select=id,is_published&id=in.(${pub.id},${dra.id})`,
  );
  record(
    "anon: only published events are visible",
    anonEvents.status === 200 &&
      anonEvents.data?.length === 1 &&
      anonEvents.data[0].id === pub.id,
    `status ${anonEvents.status}, rows ${anonEvents.data?.length ?? 0}`,
  );

  const anonToken = await rest(
    `events?select=guestlist_token&id=eq.${pub.id}`,
  );
  record(
    "anon: guestlist_token column is not readable",
    denied(anonToken.status, anonToken.data),
    `status ${anonToken.status}`,
  );

  const anonInsert = await rest("events", {
    method: "POST",
    body: {
      name: "anon insert",
      slug: `qa-anon-${STAMP}`,
      event_date: new Date(Date.now() + 864e5).toISOString(),
    },
    prefer: "return=minimal",
  });
  record(
    "anon: cannot insert events",
    denied(anonInsert.status, anonInsert.data),
    `status ${anonInsert.status}`,
  );

  const anonUpdate = await rest(`events?id=eq.${pub.id}`, {
    method: "PATCH",
    body: { name: "anon update" },
    prefer: "return=minimal",
  });
  record(
    "anon: cannot update events",
    denied(anonUpdate.status, anonUpdate.data),
    `status ${anonUpdate.status}`,
  );

  const anonDelete = await rest(`events?id=eq.${pub.id}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  record(
    "anon: cannot delete events",
    denied(anonDelete.status, anonDelete.data),
    `status ${anonDelete.status}`,
  );

  const anonGuestlist = await rest("guestlist?select=id");
  record(
    "anon: cannot read guestlist",
    denied(anonGuestlist.status, anonGuestlist.data),
    `status ${anonGuestlist.status}`,
  );

  const anonAttempts = await rest("submission_attempts?select=id");
  record(
    "anon: cannot read submission_attempts",
    denied(anonAttempts.status, anonAttempts.data),
    `status ${anonAttempts.status}`,
  );

  const anonSettings = await rest("site_settings?select=hero_tagline");
  record(
    "anon: can read site_settings",
    anonSettings.status === 200 && anonSettings.data?.length === 1,
    `status ${anonSettings.status}`,
  );

  const anonSettingsWrite = await rest("site_settings?id=eq.true", {
    method: "PATCH",
    body: { hero_tagline: "anon" },
    prefer: "return=minimal",
  });
  record(
    "anon: cannot update site_settings",
    denied(anonSettingsWrite.status, anonSettingsWrite.data),
    `status ${anonSettingsWrite.status}`,
  );

  const anonGallery = await rest("gallery_photos?select=id");
  record(
    "anon: can read gallery metadata",
    anonGallery.status === 200,
    `status ${anonGallery.status}`,
  );

  const anonGalleryInsert = await rest("gallery_photos", {
    method: "POST",
    body: { storage_path: `${crypto.randomUUID()}.png` },
    prefer: "return=minimal",
  });
  record(
    "anon: cannot insert gallery metadata",
    denied(anonGalleryInsert.status, anonGalleryInsert.data),
    `status ${anonGalleryInsert.status}`,
  );

  const linkOk = await rest("rpc/get_guestlist_event_link", {
    method: "POST",
    body: { link_token: pub.guestlist_token },
  });
  record(
    "anon: guestlist link resolves published event",
    linkOk.status === 200 && linkOk.data?.[0]?.id === pub.id,
    `status ${linkOk.status}, rows ${linkOk.data?.length ?? 0}`,
  );

  const linkDraft = await rest("rpc/get_guestlist_event_link", {
    method: "POST",
    body: { link_token: dra.guestlist_token },
  });
  record(
    "anon: guestlist link never resolves a draft",
    linkDraft.status === 200 && (linkDraft.data?.length ?? 0) === 0,
    `status ${linkDraft.status}, rows ${linkDraft.data?.length ?? 0}`,
  );

  const linkRandom = await rest("rpc/get_guestlist_event_link", {
    method: "POST",
    body: { link_token: crypto.randomUUID() },
  });
  record(
    "anon: random guestlist token returns no event",
    linkRandom.status === 200 && (linkRandom.data?.length ?? 0) === 0,
    `status ${linkRandom.status}, rows ${linkRandom.data?.length ?? 0}`,
  );

  const anonProofUpload = await storageRequest(
    `object/guestlist-proofs/${pub.id}/${crypto.randomUUID()}.png`,
    {
      method: "POST",
      token: PUBLIC_KEY,
      key: PUBLIC_KEY,
      headers: { "Content-Type": "image/png" },
      body: PNG_1X1,
    },
  );
  record(
    "anon: cannot upload a proof object",
    anonProofUpload.status >= 400,
    `status ${anonProofUpload.status}`,
  );

  const anonProofRead = await storageRequest(
    `object/guestlist-proofs/${proofPath}`,
    { token: PUBLIC_KEY, key: PUBLIC_KEY },
  );
  record(
    "anon: cannot download a proof object",
    anonProofRead.status >= 400,
    `status ${anonProofRead.status}`,
  );

  const anonGalleryUpload = await storageRequest(
    `object/gallery-photos/${crypto.randomUUID()}.png`,
    {
      method: "POST",
      token: PUBLIC_KEY,
      key: PUBLIC_KEY,
      headers: { "Content-Type": "image/png" },
      body: PNG_1X1,
    },
  );
  record(
    "anon: cannot upload to gallery bucket",
    anonGalleryUpload.status >= 400,
    `status ${anonGalleryUpload.status}`,
  );

  const anonGalleryRead = await fetch(
    `${BASE}/storage/v1/object/public/gallery-photos/${galleryName}`,
  );
  record(
    "anon: can read public gallery object",
    anonGalleryRead.status === 200,
    `status ${anonGalleryRead.status}`,
  );

  // ========================================================================
  // AUTHENTICATED NON-ADMIN
  // ========================================================================
  const plainEvents = await rest(
    `events?select=id&id=in.(${pub.id},${dra.id})`,
    { token: plainToken },
  );
  record(
    "non-admin: cannot see draft events",
    plainEvents.status === 200 &&
      plainEvents.data?.length === 1 &&
      plainEvents.data[0].id === pub.id,
    `status ${plainEvents.status}, rows ${plainEvents.data?.length ?? 0}`,
  );

  const plainGuestlist = await rest("guestlist?select=id", {
    token: plainToken,
  });
  record(
    "non-admin: guestlist RLS returns no rows",
    plainGuestlist.status === 200 && plainGuestlist.data?.length === 0,
    `status ${plainGuestlist.status}, rows ${plainGuestlist.data?.length ?? 0}`,
  );

  const plainInsert = await rest("events", {
    method: "POST",
    token: plainToken,
    body: {
      name: "plain insert",
      slug: `qa-plain-${STAMP}`,
      event_date: new Date(Date.now() + 864e5).toISOString(),
    },
    prefer: "return=minimal",
  });
  record(
    "non-admin: cannot insert events",
    denied(plainInsert.status, plainInsert.data),
    `status ${plainInsert.status}`,
  );

  const plainProofRead = await storageRequest(
    `object/guestlist-proofs/${proofPath}`,
    { token: plainToken },
  );
  record(
    "non-admin: cannot download proof objects",
    plainProofRead.status >= 400,
    `status ${plainProofRead.status}`,
  );

  // ========================================================================
  // STAFF
  // ========================================================================
  const staffEvents = await rest(
    `events?select=id,is_published&id=in.(${pub.id},${dra.id})`,
    { token: staffToken },
  );
  record(
    "staff: can see draft events",
    staffEvents.status === 200 && staffEvents.data?.length === 2,
    `status ${staffEvents.status}, rows ${staffEvents.data?.length ?? 0}`,
  );

  const staffInsert = await rest("events", {
    method: "POST",
    token: staffToken,
    body: {
      name: `QA staff insert ${STAMP}`,
      slug: `qa-staff-insert-${STAMP}`,
      event_date: new Date(Date.now() + 864e5).toISOString(),
    },
    prefer: "return=representation",
  });
  const staffEvent = staffInsert.data?.[0];
  record(
    "staff: can insert events",
    staffInsert.status === 201 && Boolean(staffEvent?.id),
    `status ${staffInsert.status}`,
  );
  if (staffEvent?.id) {
    state.events.push(staffEvent.id);
  }

  const staffUpdate = await rest(`events?id=eq.${pub.id}`, {
    method: "PATCH",
    token: staffToken,
    body: { venue: "QA venue" },
    prefer: "return=representation",
  });
  record(
    "staff: can update events",
    staffUpdate.status === 200 && staffUpdate.data?.[0]?.venue === "QA venue",
    `status ${staffUpdate.status}`,
  );

  const staffDelete = await rest(`events?id=eq.${staffEvent?.id}`, {
    method: "DELETE",
    token: staffToken,
    prefer: "return=representation",
  });
  const staffDeleteStillExists = await service(
    `events?select=id&id=eq.${staffEvent?.id}`,
  );
  record(
    "staff: cannot delete events",
    staffDelete.status === 200 &&
      (staffDelete.data?.length ?? 0) === 0 &&
      staffDeleteStillExists.data?.length === 1,
    `status ${staffDelete.status}, deleted ${staffDelete.data?.length ?? 0}`,
  );

  const staffArchive = await rest(`events?id=eq.${pub.id}`, {
    method: "PATCH",
    token: staffToken,
    body: { archived_at: new Date().toISOString() },
    prefer: "return=minimal",
  });
  record(
    "staff: cannot archive events (trigger)",
    staffArchive.status === 400,
    `status ${staffArchive.status}`,
  );

  const staffGuestlist = await rest("guestlist?select=id", {
    token: staffToken,
  });
  record(
    "staff: can read guestlist",
    staffGuestlist.status === 200 &&
      staffGuestlist.data?.some((row) => row.id === guest.id),
    `status ${staffGuestlist.status}`,
  );

  const staffGuestlistInsert = await rest("guestlist", {
    method: "POST",
    token: staffToken,
    body: {
      submission_key: crypto.randomUUID(),
      event_id: pub.id,
      full_name: "QA Forbidden",
      instagram: `qa.forbidden.${STAMP}`.slice(0, 30),
      reference_person: "QA",
      story_proof_path: proofPath,
      comment_proof_path: proofPath,
    },
    prefer: "return=minimal",
  });
  record(
    "staff: cannot insert guestlist rows directly",
    denied(staffGuestlistInsert.status, staffGuestlistInsert.data),
    `status ${staffGuestlistInsert.status}`,
  );

  const staffReview = await rest(`guestlist?id=eq.${guest.id}`, {
    method: "PATCH",
    token: staffToken,
    body: { status: "approved", admin_note: "QA review" },
    prefer: "return=representation",
  });
  const reviewed = staffReview.data?.[0];
  record(
    "staff: can review a pending submission (audit filled)",
    staffReview.status === 200 &&
      reviewed?.status === "approved" &&
      reviewed?.reviewed_by === staffId &&
      Boolean(reviewed?.reviewed_at),
    `status ${staffReview.status}, reviewed_by ${reviewed?.reviewed_by ?? "null"}`,
  );

  const staffRevert = await rest(`guestlist?id=eq.${guest.id}`, {
    method: "PATCH",
    token: staffToken,
    body: { status: "pending" },
    prefer: "return=minimal",
  });
  record(
    "staff: cannot revert review to pending",
    staffRevert.status === 400,
    `status ${staffRevert.status}`,
  );

  const staffGuestlistDelete = await rest(`guestlist?id=eq.${guest.id}`, {
    method: "DELETE",
    token: staffToken,
    prefer: "return=representation",
  });
  const guestStillExists = await service(
    `guestlist?select=id&id=eq.${guest.id}`,
  );
  record(
    "staff: cannot delete guestlist rows",
    staffGuestlistDelete.status === 200 &&
      (staffGuestlistDelete.data?.length ?? 0) === 0 &&
      guestStillExists.data?.length === 1,
    `status ${staffGuestlistDelete.status}, deleted ${staffGuestlistDelete.data?.length ?? 0}`,
  );

  const staffSettings = await rest("site_settings?id=eq.true", {
    method: "PATCH",
    token: staffToken,
    body: { hero_tagline: `QA ${STAMP}` },
    prefer: "return=representation",
  });
  record(
    "staff: can update site_settings",
    staffSettings.status === 200 && staffSettings.data?.[0]?.hero_tagline === `QA ${STAMP}`,
    `status ${staffSettings.status}`,
  );

  const staffGalleryInsert = await rest("gallery_photos", {
    method: "POST",
    token: staffToken,
    body: { storage_path: galleryName, caption: "QA" },
    prefer: "return=representation",
  });
  const galleryRow = staffGalleryInsert.data?.[0];
  record(
    "staff: can insert gallery metadata",
    staffGalleryInsert.status === 201 && Boolean(galleryRow?.id),
    `status ${staffGalleryInsert.status}`,
  );
  if (galleryRow?.id) {
    state.gallery.push(galleryRow.id);
  }

  const staffProofRead = await storageRequest(
    `object/guestlist-proofs/${proofPath}`,
    { token: staffToken },
  );
  record(
    "staff: can download proof objects",
    staffProofRead.status === 200,
    `status ${staffProofRead.status}`,
  );

  const staffProfiles = await rest("admin_profiles?select=id,role", {
    token: staffToken,
  });
  record(
    "staff: only sees their own admin profile",
    staffProfiles.status === 200 &&
      staffProfiles.data?.length === 1 &&
      staffProfiles.data[0].id === staffId,
    `status ${staffProfiles.status}, rows ${staffProfiles.data?.length ?? 0}`,
  );

  const staffProfileUpdate = await rest(`admin_profiles?id=eq.${superId}`, {
    method: "PATCH",
    token: staffToken,
    body: { display_name: "hijacked" },
    prefer: "return=representation",
  });
  record(
    "staff: cannot update another admin profile",
    [200, 204].includes(staffProfileUpdate.status) &&
      (staffProfileUpdate.data?.length ?? 0) === 0,
    `status ${staffProfileUpdate.status}, rows ${staffProfileUpdate.data?.length ?? 0}`,
  );

  // ========================================================================
  // SUPER ADMIN
  // ========================================================================
  const superProfiles = await rest("admin_profiles?select=id", {
    token: superToken,
  });
  record(
    "super admin: sees every admin profile",
    superProfiles.status === 200 && (superProfiles.data?.length ?? 0) >= 3,
    `status ${superProfiles.status}, rows ${superProfiles.data?.length ?? 0}`,
  );

  const superProfileUpdate = await rest(`admin_profiles?id=eq.${staffId}`, {
    method: "PATCH",
    token: superToken,
    body: { display_name: "QA Staff renamed" },
    prefer: "return=representation",
  });
  record(
    "super admin: can update admin profiles",
    superProfileUpdate.status === 200 &&
      superProfileUpdate.data?.[0]?.display_name === "QA Staff renamed",
    `status ${superProfileUpdate.status}`,
  );

  const superArchive = await rest(`events?id=eq.${dra.id}`, {
    method: "PATCH",
    token: superToken,
    body: { archived_at: new Date().toISOString() },
    prefer: "return=representation",
  });
  record(
    "super admin: can archive events",
    superArchive.status === 200 &&
      Boolean(superArchive.data?.[0]?.archived_at),
    `status ${superArchive.status}`,
  );

  const superGuestlistDelete = await rest(`guestlist?id=eq.${guest.id}`, {
    method: "DELETE",
    token: superToken,
    prefer: "return=minimal",
  });
  record(
    "super admin: can delete guestlist rows",
    superGuestlistDelete.status === 204,
    `status ${superGuestlistDelete.status}`,
  );
  if (superGuestlistDelete.status === 204) {
    state.guestlist = state.guestlist.filter((id) => id !== guest.id);
  }

  const superEventDelete = await rest(`events?id=eq.${staffEvent?.id}`, {
    method: "DELETE",
    token: superToken,
    prefer: "return=minimal",
  });
  record(
    "super admin: can delete events",
    superEventDelete.status === 204,
    `status ${superEventDelete.status}`,
  );
  if (superEventDelete.status === 204) {
    state.events = state.events.filter((id) => id !== staffEvent?.id);
  }

  const superGalleryDelete = await rest(`gallery_photos?id=eq.${galleryRow?.id}`, {
    method: "DELETE",
    token: superToken,
    prefer: "return=minimal",
  });
  record(
    "super admin: can delete gallery metadata",
    superGalleryDelete.status === 204,
    `status ${superGalleryDelete.status}`,
  );
  if (superGalleryDelete.status === 204) {
    state.gallery = state.gallery.filter((id) => id !== galleryRow?.id);
  }
}

try {
  await main();
} catch (error) {
  console.error("\nFATAL:", error);
  record("test run completed without fatal error", false, String(error));
} finally {
  await cleanup();
}

const failed = results.filter((result) => !result.pass);
const passed = results.length - failed.length;

console.log(`\n${passed}/${results.length} checks passed.`);

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
  await fs.writeFile("docs/qa-rls-results.md", `${lines.join("\n")}\n`, "utf8");
  console.log("\nWrote docs/qa-rls-results.md");
}
