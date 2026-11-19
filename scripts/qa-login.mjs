/**
 * PHASE 5 — admin login rate limit (browser/server-action test).
 *
 * Requires the production server running on port 3100 and the real
 * SUPABASE_SECRET_KEY in .env.local.
 *
 *   npm run qa:login
 *
 * Creates a temporary admin account, burns the 10-attempt budget with wrong
 * passwords, then proves a correct password is also refused. Removes the QA
 * account and login attempts afterwards.
 */

import { chromium } from "playwright-core";

const BASE = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3100").replace(
  /\/+$/,
  "",
);
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const STAMP = Date.now();
const USERNAME = `qa-login-${STAMP}`;
const EMAIL = `${USERNAME}@admin.loudjakarta.com`;
const CORRECT_PASSWORD = `Qa-${crypto.randomUUID()}`;
const STARTED_AT = new Date().toISOString();

if (!SUPABASE_URL || !SECRET_KEY || SECRET_KEY.includes("your_key_here")) {
  console.error("Missing Supabase environment values in .env.local.");
  process.exit(1);
}

const results = [];

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

  return { status: response.status, data: text ? JSON.parse(text) : null };
}

let userId = null;
let browser = null;

try {
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: CORRECT_PASSWORD,
      email_confirm: true,
    }),
  });
  const user = await created.json();

  if (!created.ok || !user.id) {
    throw new Error(`Could not create QA auth user: ${JSON.stringify(user)}`);
  }

  userId = user.id;

  await serviceRest("admin_profiles", {
    method: "POST",
    body: [
      {
        id: userId,
        username: USERNAME,
        display_name: "QA Login",
        role: "staff",
        is_active: true,
      },
    ],
    prefer: "return=minimal",
  });

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
  });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });

  async function attempt(password) {
    await page.waitForFunction(
      () => !document.querySelector('button[type="submit"]')?.disabled,
    );
    await page.fill("#admin-username", USERNAME);
    await page.fill("#admin-password", password);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admin/login"),
      { timeout: 15_000 },
    );

    await page.click('button[type="submit"]');
    await responsePromise;

    const alert = page.locator('form [role="alert"]');
    await alert.waitFor({ state: "visible", timeout: 15_000 });
    const message = (await alert.textContent())?.trim() ?? "";

    await page.waitForFunction(
      () => !document.querySelector('button[type="submit"]')?.disabled,
      undefined,
      { timeout: 15_000 },
    );

    return message;
  }

  let wrongMessages = [];

  for (let index = 0; index < 10; index += 1) {
    wrongMessages.push(await attempt(`wrong-${index}`));
  }

  record(
    "ten wrong passwords are rejected generically",
    wrongMessages.length === 10 &&
      wrongMessages.every((message) =>
        message.includes("Invalid username or password"),
      ),
    `${wrongMessages.filter((m) => m.includes("Invalid username or password")).length}/10 generic`,
  );

  const blocked = await attempt(CORRECT_PASSWORD);
  record(
    "eleventh attempt is rate limited even with the right password",
    blocked.includes("Too many sign-in attempts"),
    blocked.slice(0, 80),
  );

  const ledger = await serviceRest(
    `submission_attempts?select=id&kind=eq.login&created_at=gte.${encodeURIComponent(STARTED_AT)}`,
  );
  record(
    "login attempts are recorded in the hashed ledger",
    ledger.status === 200 && (ledger.data?.length ?? 0) >= 10,
    `rows ${ledger.data?.length ?? 0}`,
  );
} catch (error) {
  console.error("FATAL:", error);
  record("test run completed without fatal error", false, String(error));
} finally {
  console.log("\nCleaning up QA data…");

  if (browser) {
    await browser.close();
  }

  if (userId) {
    await serviceRest(`admin_profiles?id=eq.${userId}`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    });
  }

  await serviceRest(
    `submission_attempts?kind=eq.login&created_at=gte.${encodeURIComponent(STARTED_AT)}`,
    { method: "DELETE", prefer: "return=minimal" },
  );

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
  await fs.writeFile("docs/qa-login-results.md", `${lines.join("\n")}\n`, "utf8");
  console.log("\nWrote docs/qa-login-results.md");
}
