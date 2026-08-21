"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  sales: {
    label: "المبيعات",
    theme: { light: "#2a78d6", dark: "#3987e5" },
  },
  purchases: {
    label: "المشتريات",
    theme: { light: "#eb6834", dark: "#d95926" },
  },
} satisfies ChartConfig;

export function SalesPurchasesChart({ data }: { data: { date: string; sales: number; purchases: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => new Date(value).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => new Date(value).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="sales"
          type="monotone"
          fill="var(--color-sales)"
          fillOpacity={0.15}
          stroke="var(--color-sales)"
          strokeWidth={2}
        />
        <Area
          dataKey="purchases"
          type="monotone"
          fill="var(--color-purchases)"
          fillOpacity={0.15}
          stroke="var(--color-purchases)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
