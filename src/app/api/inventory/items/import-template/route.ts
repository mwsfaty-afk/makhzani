import { requireTenant } from "@/lib/auth/session";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  await requireTenant();
  const headers = ["الكود", "الاسم بالعربية", "الاسم بالإنجليزية", "الوحدة", "المجموعة", "العلامة التجارية", "سعر الشراء", "سعر البيع"];
  const sampleRows = [
    ["ITM-001", "أرز أبو كاس 5 كجم", "Rice 5kg", "كرتونة", "بقالة", "أبو كاس", "180", "220"],
    ["ITM-002", "زيت عافية 1 لتر", "Oil 1L", "قطعة", "بقالة", "عافية", "45", "60"],
  ];
  return csvResponse("نموذج-استيراد-الأصناف.csv", toCsv(headers, sampleRows));
}
