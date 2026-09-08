import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCsv, parseCsvRows } from "./csv.ts";

/**
 * Offline unit tests for the hand-rolled CSV parser. Uses only Node built-ins
 * (node:test + node:assert); the module under test has zero runtime imports.
 *
 * Run with a TypeScript-capable Node (>= 22.6):
 *   unset NODE_OPTIONS && node --experimental-strip-types --test src/lib/csv.test.ts
 */

test("parses a simple header + rows into objects", () => {
  const csv = "title,year,genre\nInception,2010,Sci-Fi\nHeat,1995,Crime";
  const rows = parseCsv(csv);
  assert.deepEqual(rows, [
    { title: "Inception", year: "2010", genre: "Sci-Fi" },
    { title: "Heat", year: "1995", genre: "Crime" },
  ]);
});

test("handles quoted fields containing commas", () => {
  const csv = 'title,cast\n"Heat","Pacino, De Niro"';
  const rows = parseCsv(csv);
  assert.equal(rows[0].cast, "Pacino, De Niro");
});

test("handles escaped quotes via doubling", () => {
  const csv = 'title,note\n"The ""Best"" Film","a quote ""here"""';
  const rows = parseCsv(csv);
  assert.equal(rows[0].title, 'The "Best" Film');
  assert.equal(rows[0].note, 'a quote "here"');
});

test("handles newlines inside quoted fields", () => {
  const csv = 'title,description\n"Multi","line one\nline two"';
  const rows = parseCsv(csv);
  assert.equal(rows[0].description, "line one\nline two");
});

test("handles CRLF line endings", () => {
  const csv = "title,year\r\nInception,2010\r\nHeat,1995\r\n";
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].title, "Heat");
});

test("skips trailing blank lines", () => {
  const csv = "title,year\nInception,2010\n\n";
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Inception");
});

test("trims header and cell whitespace", () => {
  const csv = " title , year \n Inception , 2010 ";
  const rows = parseCsv(csv);
  assert.deepEqual(rows[0], { title: "Inception", year: "2010" });
});

test("missing trailing cells default to empty string", () => {
  const csv = "title,year,genre\nInception,2010";
  const rows = parseCsv(csv);
  assert.equal(rows[0].genre, "");
});

test("parseCsvRows returns raw cell arrays including header", () => {
  const csv = "a,b\n1,2";
  const rows = parseCsvRows(csv);
  assert.deepEqual(rows, [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("empty input yields no records", () => {
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsvRows(""), []);
});
