/**
 * PHASE 5 — browser, responsive and accessibility checks.
 *
 * Uses the locally installed Microsoft Edge through playwright-core, so no
 * browser download is required. Run the production build first:
 *
 *   npm run build
 *   npm start -- -p 3100
 *   npm run qa:browser
 *
 * Optional: set QA_GUESTLIST_TOKEN to also audit the private guestlist form.
 * Screenshots are written to qa-artifacts/ (gitignored).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const BASE = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3100").replace(
  /\/+$/,
  "",
);
const GUESTLIST_TOKEN = process.env.QA_GUESTLIST_TOKEN ?? "";
const WRITE_DOCS = process.env.QA_WRITE_DOCS === "1";

const VIEWPORTS = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "djs", path: "/djs" },
  { name: "privacy", path: "/privacy" },
  { name: "login", path: "/admin/login" },
  { name: "not-found", path: "/this-page-does-not-exist", expect: 404 },
  ...(GUESTLIST_TOKEN
    ? [{ name: "guestlist", path: `/guestlist/${GUESTLIST_TOKEN}` }]
    : []),
];

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const AXE_SOURCE = await readFile(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8",
);

async function auditPage(browser, target, viewport) {
  const label = `${target.name} @${viewport.name}`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();

    // A 404 page logs its own document response as a console error. That is
    // the expected HTTP status, not a regression.
    if (target.expect === 404 && /status of 404/i.test(text)) {
      return;
    }

    consoleErrors.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
      });
    });
  });

  const response = await page.goto(`${BASE}${target.path}`, {
    waitUntil: "networkidle",
  });

  const expectedStatus = target.expect ?? 200;
  record(
    `${label}: HTTP ${expectedStatus}`,
    response?.status() === expectedStatus,
    `status ${response?.status() ?? "no response"}`,
  );

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    h1: document.querySelectorAll("h1").length,
    imagesWithoutAlt: document.querySelectorAll("img:not([alt])").length,
    missingControlLabels: Array.from(
      document.querySelectorAll("input, select, textarea"),
    ).filter((element) => {
      if (element.type === "hidden") {
        return false;
      }

      const id = element.getAttribute("id");

      return !(
        element.getAttribute("aria-label") ||
        element.getAttribute("aria-labelledby") ||
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        element.closest("label")
      );
    }).length,
    cspViolations: window.__cspViolations ?? [],
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));

  record(
    `${label}: no horizontal overflow`,
    metrics.scrollWidth <= metrics.innerWidth + 1,
    `scrollWidth ${metrics.scrollWidth} vs viewport ${metrics.innerWidth}`,
  );
  record(
    `${label}: exactly one h1`,
    metrics.h1 === 1,
    `${metrics.h1} h1 element(s)`,
  );
  record(
    `${label}: every image has an alt attribute`,
    metrics.imagesWithoutAlt === 0,
    `${metrics.imagesWithoutAlt} without alt`,
  );
  record(
    `${label}: every form control has a label`,
    metrics.missingControlLabels === 0,
    `${metrics.missingControlLabels} unlabeled`,
  );
  record(
    `${label}: no CSP violations`,
    metrics.cspViolations.length === 0,
    metrics.cspViolations
      .map((violation) => `${violation.directive} ${violation.blockedURI}`)
      .join(", "),
  );
  record(
    `${label}: reduced motion respected`,
    metrics.scrollBehavior === "auto",
    `scroll-behavior ${metrics.scrollBehavior}`,
  );
  record(
    `${label}: no console/page errors`,
    consoleErrors.length === 0 && pageErrors.length === 0,
    [...consoleErrors, ...pageErrors].join(" | ").slice(0, 300),
  );

  if (target.name !== "login") {
    await mkdir("qa-artifacts", { recursive: true });
    await page.screenshot({
      path: `qa-artifacts/${target.name}-${viewport.name}.png`,
      fullPage: true,
    });

    const focusOrder = [];
    await page.keyboard.press("Tab");
    focusOrder.push(
      await page.evaluate(() => {
        const active = document.activeElement;

        return {
          tag: active?.tagName ?? "",
          text: (active?.textContent ?? "").trim().slice(0, 40),
        };
      }),
    );

    record(
      `${label}: first Tab reaches the skip link`,
      focusOrder[0]?.tag === "A" && /skip to content/i.test(focusOrder[0].text),
      `${focusOrder[0]?.tag} "${focusOrder[0]?.text}"`,
    );
  }

  await context.close();

  // Accessibility audit with axe. bypassCSP lets axe use its own Function
  // constructors; CSP enforcement is verified in the strict pass above.
  const a11yContext = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    bypassCSP: true,
  });
  const a11yPage = await a11yContext.newPage();
  await a11yPage.goto(`${BASE}${target.path}`, { waitUntil: "networkidle" });
  await a11yPage.evaluate(AXE_SOURCE);

  const axe = await a11yPage.evaluate(async () => {
    const run = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });

    return run.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
    }));
  });

  record(
    `${label}: axe WCAG A/AA`,
    axe.length === 0,
    axe.map((v) => `${v.id}(${v.impact}, ${v.nodes})`).join(", "),
  );

  await a11yContext.close();
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  for (const target of PAGES) {
    for (const viewport of VIEWPORTS) {
      await auditPage(browser, target, viewport);
    }
  }
} finally {
  await browser.close();
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

if (WRITE_DOCS) {
  const lines = [
    "| # | Check | Result | Detail |",
    "|---|-------|--------|--------|",
    ...results.map(
      (result, index) =>
        `| ${index + 1} | ${result.name} | ${result.pass ? "PASS" : "FAIL"} | ${result.detail.replace(/\|/g, "\\|")} |`,
    ),
  ];
  await writeFile("docs/qa-browser-results.md", `${lines.join("\n")}\n`, "utf8");
  console.log("\nWrote docs/qa-browser-results.md");
}
