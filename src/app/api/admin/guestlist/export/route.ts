import { NextResponse } from "next/server";

import { parseGuestlistFilters } from "@/lib/admin/guestlist-filters";
import { getAdminSession } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_PAGE_SIZE = 1000;

type ExportRow = {
  id: string;
  full_name: string;
  instagram: string;
  reference_person: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  admin_note: string | null;
  event: { name: string; event_date: string } | null;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

/** Escapes CSV cells and neutralizes spreadsheet formula injection. */
function csvCell(value: string | null | undefined): string {
  let text = value ?? "";

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export async function GET(request: Request) {
  const admin = await getAdminSession();

  if (!admin) {
    return jsonError(401, "unauthorized", "Authentication required.");
  }

  if (admin.role !== "super_admin") {
    return jsonError(
      403,
      "forbidden",
      "CSV export is restricted to super admins.",
    );
  }

  const url = new URL(request.url);
  const rawParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });

  const filters = parseGuestlistFilters(rawParams);
  const supabase = await createServerSupabaseClient();
  const rows: ExportRow[] = [];

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    let query = supabase
      .from("guestlist")
      .select(
        "id,full_name,instagram,reference_person,status,created_at,reviewed_at,admin_note,event:events(name,event_date)",
      )
      .order("created_at", { ascending: filters.sort === "oldest" })
      .range(from, from + EXPORT_PAGE_SIZE - 1);

    if (filters.q) {
      const term = filters.q.replace(/[%]/g, "");
      query = query.or(
        `full_name.ilike.%${term}%,instagram.ilike.%${term}%`,
      );
    }

    if (filters.eventId) {
      query = query.eq("event_id", filters.eventId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/export] query failed", { code: error.code });
      return jsonError(500, "export_failed", "The export could not be built.");
    }

    rows.push(...((data ?? []) as ExportRow[]));

    if (!data || data.length < EXPORT_PAGE_SIZE) {
      break;
    }
  }

  const header = [
    "Reference",
    "Event",
    "Event date (UTC)",
    "Full name",
    "Instagram",
    "PR / reference",
    "Status",
    "Submitted (UTC)",
    "Reviewed (UTC)",
    "Admin note",
  ];

  const lines = [header.map(csvCell).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id.slice(0, 8).toUpperCase(),
        row.event?.name ?? "",
        row.event?.event_date ?? "",
        row.full_name,
        `@${row.instagram}`,
        row.reference_person,
        row.status,
        row.created_at,
        row.reviewed_at ?? "",
        row.admin_note ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  // BOM keeps Excel happy with UTF-8 names.
  const body = `\uFEFF${lines.join("\r\n")}\r\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="loud-jakarta-guestlist-${today}.csv"`,
      "cache-control": "no-store",
      "x-export-rows": String(rows.length),
    },
  });
}
