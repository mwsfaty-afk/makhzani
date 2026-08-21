#!/usr/bin/env bash
# استعادة قاعدة بيانات Makhzani من نسخة احتياطية أُنشئت بواسطة backup-database.sh
#
# تحذير: pg_restore --clean يحذف الجداول الموجودة قبل استعادتها. لا تُشغّل هذا مباشرة على
# قاعدة الإنتاج الحية إلا في سيناريو Disaster Recovery فعلي — راجع دائمًا
# docs/BACKUP_AND_RECOVERY.md أولًا. يُفضَّل الاستعادة إلى قاعدة/مشروع Supabase جديد
# مؤقت للتحقق من سلامة النسخة قبل استبدال أي بيانات حقيقية.
#
# الاستخدام: DIRECT_URL="postgresql://..." ./scripts/restore-database.sh backups/makhzani_XXXX.dump

set -euo pipefail

if [ -z "${DIRECT_URL:-}" ]; then
  echo "خطأ: متغير البيئة DIRECT_URL غير مضبوط" >&2
  exit 1
fi

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "الاستخدام: $0 <path-to-dump-file>" >&2
  exit 1
fi

echo "سيتم استعادة $DUMP_FILE إلى قاعدة البيانات المشار إليها بـ DIRECT_URL."
read -p "اكتب 'yes' للمتابعة: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "تم الإلغاء."
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DIRECT_URL" "$DUMP_FILE"

echo "اكتملت الاستعادة. شغّل 'npx prisma migrate deploy' للتأكد من مطابقة السكيمة لآخر migration."
