/**
 * أسباب حركات المخزون اليدوية (دخول/خروج) — مصدر واحد للحقيقة يُستخدم في كل من نافذة
 * "دخول/خروج سريع" (تسوية فردية فورية) وأوامر التوريد/الصرف (مستند متعدد البنود
 * بمرحلة Draft→اعتماد)، لتفادي تكرار نفس القائمتين في مكانين.
 */
export const IN_REASONS = ["opening", "adjustment", "gift", "production", "other"] as const;
export const OUT_REASONS = ["damage", "consumption", "sample", "production", "other"] as const;

export type InReason = (typeof IN_REASONS)[number];
export type OutReason = (typeof OUT_REASONS)[number];

export const IN_REASON_LABELS: Record<InReason, string> = {
  opening: "رصيد افتتاحي",
  adjustment: "تسوية",
  gift: "هدية/عينة واردة",
  production: "إنتاج داخلي",
  other: "أخرى",
};

export const OUT_REASON_LABELS: Record<OutReason, string> = {
  damage: "تلف",
  consumption: "استهلاك داخلي",
  sample: "عينة صادرة",
  production: "إنتاج داخلي",
  other: "أخرى",
};

/** نوع حركة المخزون الناتج عن سبب واتجاه معيَّنين — نفس القاعدة المستخدَمة في كل من
 * الفورم السريع وأوامر التوريد/الصرف. */
export function movementTypeForAdjustment(direction: "IN" | "OUT", reason: string) {
  if (direction === "IN") return reason === "opening" ? "OPENING_BALANCE" : "STOCK_ADJUSTMENT_IN";
  return reason === "damage" ? "DAMAGE" : "STOCK_ADJUSTMENT_OUT";
}
