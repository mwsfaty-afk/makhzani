import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsIndexPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">التقارير</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/reports/profit">
          <Card className="transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 py-5">
              <TrendingUp className="size-5 text-primary" />
              <div>
                <p className="font-medium">تقرير الأرباح</p>
                <p className="text-sm text-muted-foreground">الربح حسب الصنف، العميل، المخزن، والفترة</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
