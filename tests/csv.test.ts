import { describe, it, expect } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses simple comma-separated rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const rows = parseCsv("﻿الكود,الاسم\nITM-001,أرز");
    expect(rows[0]).toEqual(["الكود", "الاسم"]);
  });

  it("handles quoted fields containing commas and escaped quotes", () => {
    const rows = parseCsv('code,name\nITM-001,"أرز, أبو ""كاس"" 5 كجم"');
    expect(rows[1]).toEqual(["ITM-001", 'أرز, أبو "كاس" 5 كجم']);
  });

  it("handles both CRLF and LF line endings in the same file", () => {
    const rows = parseCsv("a,b\r\n1,2\n3,4");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("drops blank trailing lines", () => {
    const rows = parseCsv("a,b\n1,2\n\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("round-trips through toCsv", () => {
    const csv = toCsv(["code", "name"], [["ITM-001", "Rice, 5kg"]]);
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["code", "name"],
      ["ITM-001", "Rice, 5kg"],
    ]);
  });
});
