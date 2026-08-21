#!/usr/bin/env bash
# نسخة احتياطية كاملة لقاعدة بيانات Makhzani عبر pg_dump — تُشغَّل يدويًا أو من
# GitHub Actions (راجع .github/workflows/backup.yml) أو أي جدولة أخرى (cron/Task Scheduler).
#
# يتطلب: pg_dump مثبَّت (متوفر افتراضيًا على ubuntu-latest في GitHub Actions؛ على الجهاز
# المحلي: `apt install postgresql-client` / `brew install libpq` / حزمة PostgreSQL على ويندوز).
#
# مهم: يستخدم DIRECT_URL (الاتصال المباشر، المنفذ 5432) وليس DATABASE_URL (المجمِّع
# pgbouncer، المنفذ 6543) — pg_dump لا يعمل بشكل موثوق عبر PgBouncer في وضع Transaction.

set -euo pipefail

if [ -z "${DIRECT_URL:-}" ]; then
  echo "خطأ: متغير البيئة DIRECT_URL غير مضبوط" >&2
  exit 1
fi

OUT_DIR="${BACKUP_OUT_DIR:-./backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUT_FILE="$OUT_DIR/makhzani_${TIMESTAMP}.dump"

echo "Backing up database to $OUT_FILE ..."
pg_dump "$DIRECT_URL" --format=custom --no-owner --no-privileges --file="$OUT_FILE"

echo "Backup complete: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

# احتفاظ محلي اختياري: احذف أي نسخة أقدم من 30 يومًا في مجلد الإخراج نفسه (لا يؤثر على
# أي نسخ تم رفعها بالفعل كـ GitHub Actions artifact — تلك تُدار عبر retention-days هناك).
find "$OUT_DIR" -name "makhzani_*.dump" -mtime +30 -delete 2>/dev/null || true
