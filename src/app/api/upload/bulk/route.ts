import type { NextRequest } from "next/server";

import { parseCsv } from "@/lib/csv";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { ok, fail } from "@/lib/apiResponse";
import { bulkMovieRowSchema } from "@/lib/validation";
import { createMovie } from "@/services/mongodb/movieRepository";
import type { Movie } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload/bulk
 *
 * Bulk-create many movies at once from metadata rows that already reference
 * hosted video URLs (no file upload here — this is for catalog rows whose media
 * is already stored). Accepts three input shapes:
 *
 *   1. JSON:            { "items": [ {row}, {row}, ... ] }
 *   2. JSON with CSV:   { "csv": "title,year,...\n..." }
 *   3. Raw CSV body:    Content-Type: text/csv, body is the CSV text
 *   4. multipart form:  a `csv` text field, or a `file` CSV upload
 *
 * Each row is validated with `bulkMovieRowSchema` (array fields may be
 * pipe/comma-delimited strings in CSV). Rows are inserted independently: the
 * response reports per-row success/failure so one bad row does not abort the
 * batch. Admin-gated (fails closed with 401).
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return fail("Unauthorized", 401);
  }

  let rawRows: unknown[];
  try {
    rawRows = await extractRows(request);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Invalid bulk payload",
      400,
    );
  }

  if (rawRows.length === 0) {
    return fail("No rows to import", 400);
  }

  const created: Movie[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let index = 0; index < rawRows.length; index += 1) {
    const parsed = bulkMovieRowSchema.safeParse(rawRows[index]);
    if (!parsed.success) {
      errors.push({ index, error: "Invalid row" });
      continue;
    }
    try {
      const movie = await createMovie(parsed.data);
      created.push(movie);
    } catch {
      errors.push({ index, error: "Failed to save" });
    }
  }

  const status = created.length > 0 ? 201 : 400;
  return ok(
    {
      createdCount: created.length,
      failedCount: errors.length,
      created,
      errors,
    },
    undefined,
    status,
  );
}

/**
 * Extract the raw (unvalidated) rows from the request according to its content
 * type. Returns an array of plain objects ready for per-row validation.
 */
async function extractRows(request: NextRequest): Promise<unknown[]> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON body");
    });
    if (body && typeof body === "object" && "items" in body) {
      const items = (body as { items: unknown }).items;
      if (!Array.isArray(items)) {
        throw new Error("'items' must be an array");
      }
      return items;
    }
    if (body && typeof body === "object" && "csv" in body) {
      const csv = (body as { csv: unknown }).csv;
      if (typeof csv !== "string") {
        throw new Error("'csv' must be a string");
      }
      return parseCsv(csv);
    }
    throw new Error("Expected { items: [...] } or { csv: \"...\" }");
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const csvField = form.get("csv");
    if (typeof csvField === "string" && csvField.trim() !== "") {
      return parseCsv(csvField);
    }
    const file = form.get("file");
    if (file instanceof File) {
      return parseCsv(await file.text());
    }
    const itemsField = form.get("items");
    if (typeof itemsField === "string" && itemsField.trim() !== "") {
      const items = JSON.parse(itemsField);
      if (!Array.isArray(items)) {
        throw new Error("'items' must be a JSON array");
      }
      return items;
    }
    throw new Error("Provide a 'csv' field, 'file' upload, or 'items' JSON");
  }

  // Fallback: treat the raw body as CSV text (e.g. Content-Type: text/csv).
  const text = await request.text();
  if (text.trim() === "") {
    throw new Error("Empty request body");
  }
  return parseCsv(text);
}
