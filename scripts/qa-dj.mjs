/**
 * DJ presskit end-to-end check.
 *
 * Requires a dev/production server with the current code and the real
 * SUPABASE_SECRET_KEY in .env.local:
 *
 *   npm run qa:dj
 *
 * Flow: super admin creates a DJ-only account from /admin/users, the DJ signs
 * in and lands on /dj, saves a presskit with a photo, and the published
 * presskit is visible on /djs, /djs/<slug> and the homepage. Role guards are
 * checked in both directions. Temporary accounts and uploads are removed.
 */

import { chromium } from "playwright-core";

const BASE = (process.env.QA_BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const STAMP = Date.now();
const ADMIN_USERNAME = `qa-admindj-${STAMP}`;
const ADMIN_PASSWORD = `Qa-${crypto.randomUUID()}`;
const DJ_USERNAME = `qa-dj-${STAMP}`;
const DJ_PASSWORD = `Qa-${crypto.randomUUID()}`;
const STAGE_NAME = `QA Selector ${STAMP}`;

// 1x1 transparent PNG, enough to exercise compression and upload plumbing.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.includes("your_key_here")) {
  console.error("Missing Supabase environment values in .env.local.");
  process.exit(1);
}

const results = [];
let browser = null;
let adminUserId = null;
let djUserId = null;
let djPhotoPath = null;

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

  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function createAuthUser(username, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `${username}@admin.loudjakarta.com`,
      password,
      email_confirm: true,
    }),
  });
  const user = await response.json();

  if (!response.ok || !user.id) {
    throw new Error(`Could not create QA auth user: ${JSON.stringify(user)}`);
  }

  return user.id;
}

async function signIn(page, username, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#admin-username", username);
  await page.fill("#admin-password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), {
      timeout: 20_000,
    }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}

async function signOut(page) {
  // Sign out lives in the authenticated shell; land on a page that has it.
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await Promise.all([
    page.waitForURL(/\/admin\/login/, { timeout: 20_000 }),
    page.getByRole("button", { name: "Sign out" }).click(),
  ]);
}

try {
  // --- Setup: a super admin account (direct, so the UI flow is clean) ------
  adminUserId = await createAuthUser(ADMIN_USERNAME, ADMIN_PASSWORD);
  await serviceRest("admin_profiles", {
    method: "POST",
    body: [
      {
        id: adminUserId,
        username: ADMIN_USERNAME,
        display_name: "QA Admin DJ",
        role: "super_admin",
        roles: ["super_admin"],
        is_active: true,
      },
    ],
    prefer: "return=minimal",
  });

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.log("console error:", message.text().slice(0, 200));
    }
  });
  page.on("requestfailed", (request) => {
    console.log(
      "request failed:",
      request.method(),
      request.url().slice(0, 120),
      request.failure()?.errorText,
    );
  });

  // --- Admin creates a DJ-only account from the users page ----------------
  await signIn(page, ADMIN_USERNAME, ADMIN_PASSWORD);
  record("Super admin lands on the dashboard", page.url() === `${BASE}/admin`);

  await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
  const createForm = page.locator("form:has(#user-username)");
  await page.fill("#user-display-name", "QA DJ");
  await createForm.locator('input[name="roles"][value="admin"]').uncheck();
  await createForm.locator('input[name="roles"][value="dj"]').check();
  await page.fill("#user-username", DJ_USERNAME);
  await page.fill("#user-password", DJ_PASSWORD);
  await createForm.getByRole("button", { name: "Create user" }).click();

  const createdBox = page.getByRole("status");
  await createdBox.waitFor({ timeout: 20_000 });
  const createdText = await createdBox.innerText();
  record(
    "Admin creates a DJ-only user",
    createdText.toLowerCase().includes(DJ_USERNAME) &&
      createdText.toLowerCase().includes("password"),
    createdText.replace(/\s+/g, " ").slice(0, 160),
  );

  const djProfile = await serviceRest(
    `admin_profiles?username=eq.${DJ_USERNAME}&select=id,role,roles,is_active`,
  );
  const profile = djProfile.data?.[0];
  djUserId = profile?.id ?? null;
  record(
    "Created account has only the DJ role",
    Boolean(
      profile &&
        profile.is_active &&
        profile.role === "dj" &&
        Array.isArray(profile.roles) &&
        profile.roles.length === 1 &&
        profile.roles[0] === "dj",
    ),
    JSON.stringify(profile),
  );

  await signOut(page);

  // --- DJ signs in and lands on the presskit editor -----------------------
  await signIn(page, DJ_USERNAME, DJ_PASSWORD);
  await page.waitForURL(/\/dj$/, { timeout: 20_000 });
  record("DJ-only login lands on /dj", page.url() === `${BASE}/dj`);

  const heading = await page.locator("h1").first().innerText();
  record("DJ sees the presskit editor", heading.toUpperCase().includes("MY PRESSKIT"));

  // DJ must not reach the admin dashboard.
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/dj$/, { timeout: 20_000 });
  record("DJ-only account is redirected away from /admin", page.url() === `${BASE}/dj`);

  await page.goto(`${BASE}/dj/account`, { waitUntil: "networkidle" });
  record(
    "DJ can reach the account page",
    page.url() === `${BASE}/dj/account` &&
      (await page.locator("h1").innerText()).toUpperCase().includes("ACCOUNT"),
  );

  // --- Save the presskit ---------------------------------------------------
  await page.goto(`${BASE}/dj`, { waitUntil: "networkidle" });
  await page.fill("#dj-stage-name", STAGE_NAME);
  await page.fill("#dj-bio", "QA presskit bio for the LOUD JAKARTA test run.");
  await page.fill("#dj-genres", "House\nDisco");
  await page.fill("#dj-venues", "LOUD JAKARTA\nQA Test Venue Senayan");
  await page.fill("#dj-instagram", "@qa_selector");
  await page.locator("#dj-photo").setInputFiles({
    name: "dj-photo.png",
    mimeType: "image/png",
    buffer: PNG,
  });

  const saveButton = page.getByRole("button", { name: "Save presskit" });
  console.log(
    "save button disabled:",
    await saveButton.isDisabled(),
    "| selected file:",
    await page
      .locator("#dj-photo")
      .evaluate((element) => element.files?.length ?? 0),
  );

  await saveButton.click();

  const successBox = page.locator('form [role="status"]');
  const alertBox = page.locator('form [role="alert"]');
  const outcome = await Promise.race([
    successBox.waitFor({ timeout: 30_000 }).then(() => "success").catch(() => null),
    alertBox.waitFor({ timeout: 30_000 }).then(() => "error").catch(() => null),
  ]);

  if (outcome === "error") {
    console.log(
      "Save error:",
      (await alertBox.first().innerText()).replace(/\s+/g, " "),
    );
  } else if (outcome === null) {
    console.log(
      "Save produced no message. Visible messages:",
      await page.locator('[role="alert"],[role="status"]').allInnerTexts(),
      "| url:",
      page.url(),
    );
  }

  const successText = outcome === "success" ? await successBox.innerText() : "";
  record("Presskit saves", outcome === "success" && successText.includes("Presskit saved."), successText);

  const publicLink = successBox.getByRole("link", { name: /public page/i });
  const publicHref = await publicLink.getAttribute("href");
  record(
    "Save returns the public presskit URL",
    Boolean(publicHref && /^\/djs\/[a-z0-9-]+$/.test(publicHref)),
    publicHref ?? "no link",
  );

  const djRow = await serviceRest(
    `djs?profile_id=eq.${djUserId}&select=stage_name,slug,genres,venues,instagram_url,photo_path,is_published`,
  );
  const saved = djRow.data?.[0];
  djPhotoPath = saved?.photo_path ?? null;
  record(
    "Presskit row stores photo, genres, venues and publish state",
    Boolean(
      saved &&
        saved.stage_name === STAGE_NAME &&
        saved.is_published &&
        saved.photo_path?.startsWith(`${djUserId}/`) &&
        saved.genres.includes("House") &&
        saved.venues.includes("LOUD JAKARTA") &&
        saved.instagram_url === "https://www.instagram.com/qa_selector/",
    ),
    JSON.stringify(saved),
  );

  // --- Public visibility ---------------------------------------------------
  const publicResponse = await page.goto(`${BASE}${publicHref}`, {
    waitUntil: "networkidle",
  });
  record("Public presskit returns 200", publicResponse?.status() === 200);
  record(
    "Public presskit shows the stage name",
    (await page.locator("h1").first().innerText()).trim().toUpperCase() ===
      STAGE_NAME.toUpperCase(),
  );
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  record(
    "Public presskit shows genres and venues",
    bodyText.includes("house") &&
      bodyText.includes("disco") &&
      bodyText.includes("qa test venue senayan"),
  );
  record(
    "Public presskit renders the photo",
    (await page.locator(`img[alt="Presskit photo of ${STAGE_NAME}"]`).count()) === 1,
  );

  await page.goto(`${BASE}/djs`, { waitUntil: "networkidle" });
  record(
    "DJ directory lists the presskit",
    (await page.getByRole("link", { name: new RegExp(STAGE_NAME) }).count()) >= 1,
  );

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  record(
    "Homepage DJ section lists the presskit",
    (await page.locator("#djs").count()) === 1 &&
      (await page.getByRole("link", { name: new RegExp(STAGE_NAME) }).count()) >= 1,
  );
  record(
    "Primary nav links to the DJ section",
    (await page.locator('header a[href="/#djs"]').count()) >= 1,
  );

  // --- Anonymous visitors (no session) can read the roster ----------------
  const anonContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const anonPage = await anonContext.newPage();
  const anonList = await anonPage.goto(`${BASE}/djs`, { waitUntil: "networkidle" });
  record("Anonymous visitor gets /djs 200", anonList?.status() === 200);
  record(
    "Anonymous visitor sees the published presskit",
    (await anonPage.getByRole("link", { name: new RegExp(STAGE_NAME) }).count()) >= 1,
  );
  const anonDetail = await anonPage.goto(`${BASE}${publicHref}`, {
    waitUntil: "networkidle",
  });
  record(
    "Anonymous visitor gets the presskit 200",
    anonDetail?.status() === 200,
  );
  await anonContext.close();

  const notFound = await page.goto(`${BASE}/djs/does-not-exist-${STAMP}`, {
    waitUntil: "networkidle",
  });
  record("Unknown DJ slug returns 404", notFound?.status() === 404);

  // --- Unpublish hides the presskit ---------------------------------------
  await page.goto(`${BASE}/dj`, { waitUntil: "networkidle" });
  await page.locator('input[name="isPublished"]').uncheck();
  await page.getByRole("button", { name: "Save presskit" }).click();
  await page.locator('form [role="status"]').waitFor({ timeout: 30_000 });

  const draftResponse = await page.goto(`${BASE}${publicHref}`, {
    waitUntil: "networkidle",
  });
  record("Unpublished presskit is hidden publicly", draftResponse?.status() === 404);

  // --- Non-DJ admin cannot open the DJ editor -----------------------------
  await signOut(page);
  await signIn(page, ADMIN_USERNAME, ADMIN_PASSWORD);
  await page.goto(`${BASE}/dj`, { waitUntil: "networkidle" });
  record(
    "Admin without the DJ role is blocked from /dj",
    page.url().includes("/admin/unauthorized"),
    page.url(),
  );

  record("No browser page errors", pageErrors.length === 0, pageErrors.join(" | "));

  const failed = results.filter((result) => !result.pass);

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("QA DJ run failed:", error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close().catch(() => {});
  }

  if (djPhotoPath) {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/dj-photos/${djPhotoPath
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      {
        method: "DELETE",
        headers: {
          apikey: SECRET_KEY,
          Authorization: `Bearer ${SECRET_KEY}`,
        },
      },
    ).catch(() => {});
  }

  for (const id of [djUserId, adminUserId]) {
    if (id) {
      await serviceRest(`admin_profiles?id=eq.${id}`, { method: "DELETE" });
      await serviceRest(`djs?profile_id=eq.${id}`, { method: "DELETE" });
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          apikey: SECRET_KEY,
          Authorization: `Bearer ${SECRET_KEY}`,
        },
      }).catch(() => {});
    }
  }
}
