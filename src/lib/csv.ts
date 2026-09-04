/** يحوّل مصفوفة صفوف إلى نص CSV صالح لفتحه في Excel، مع دعم UTF-8 للنصوص العربية (BOM). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  return "﻿" + lines.join("\r\n");
}

/** يفكّك نص CSV (بأي ترميز أسطر — CRLF أو LF) إلى مصفوفة صفوف من الأعمدة، مع دعم القيم
 * المحاطة بعلامات اقتباس (تحتوي فواصل أو أسطر جديدة) ونزع BOM إن وُجد في بداية الملف. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // يُتجاهَل — \n التالي هو ما يُنهي الصف
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** ترويسات HTTP لا تقبل إلا حروف Latin-1، فاسم ملف عربي (مثل "نموذج-الأصناف.csv") يكسر
 * `Content-Disposition` مباشرة — لذلك نرسل بديلًا ASCII للمتصفحات القديمة عبر `filename=`،
 * والاسم العربي الحقيقي عبر `filename*=UTF-8''...` (RFC 5987) الذي تعتمده كل المتصفحات
 * الحديثة فعليًا عند الحفظ. */
export function csvResponse(filename: string, csv: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
