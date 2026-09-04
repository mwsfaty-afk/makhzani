import { requireTenant } from "@/lib/auth/session";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  await requireTenant();
  const headers = ["الكود", "الاسم", "الهاتف", "البريد الإلكتروني", "الرقم الضريبي", "حد الائتمان", "الرصيد الافتتاحي"];
  const sampleRows = [
    ["CUS-001", "متجر النور", "01012345678", "", "", "5000", "0"],
    ["CUS-002", "أحمد محمد", "01098765432", "ahmed@example.com", "", "0", "0"],
  ];
  return csvResponse("نموذج-استيراد-العملاء.csv", toCsv(headers, sampleRows));
}
