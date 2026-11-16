import type { ZodError } from "zod";

export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

const NO_STORE_HEADERS = { "cache-control": "no-store" } as const;

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(
    { ok: true as const, data },
    { status, headers: NO_STORE_HEADERS },
  );
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  options: {
    fields?: Record<string, string>;
    retryAfterSeconds?: number;
  } = {},
): Response {
  const headers: Record<string, string> = { ...NO_STORE_HEADERS };

  if (options.retryAfterSeconds) {
    headers["retry-after"] = String(options.retryAfterSeconds);
  }

  const body: ApiErrorBody = {
    ok: false,
    error: {
      code,
      message,
      ...(options.fields ? { fields: options.fields } : {}),
    },
  };

  return Response.json(body, { status, headers });
}

/** Reads a small JSON body and refuses anything suspiciously large. */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return { ok: false };
  }

  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

/** Flattens a Zod error into the first message per top-level field. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];

    if (typeof key === "string" && !fields[key]) {
      fields[key] = issue.message;
    }
  }

  return fields;
}
