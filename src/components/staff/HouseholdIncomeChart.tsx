import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INCOME_BRACKETS = [
  { key: "below5k", label: "Below ₱5,000", min: 0, max: 4999 },
  { key: "5k-10k", label: "₱5,000–₱10,000", min: 5000, max: 10000 },
  { key: "10k-20k", label: "₱10,001–₱20,000", min: 10001, max: 20000 },
  { key: "20k-40k", label: "₱20,001–₱40,000", min: 20001, max: 40000 },
  { key: "above40k", label: "Above ₱40,000", min: 40001, max: Infinity },
  { key: "unknown", label: "Not Specified", min: -1, max: -1 },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 80%, 50%)",
  "hsl(var(--muted-foreground))",
];

const chartConfig = Object.fromEntries(
  INCOME_BRACKETS.map((b, i) => [b.key, { label: b.label, color: COLORS[i] }])
);

const parseIncome = (val: string | null): number | null => {
  if (!val || val.trim() === "" || val.toLowerCase() === "none" || val === "0") return null;
  const cleaned = val.replace(/[₱,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const HouseholdIncomeChart = () => {
  const [data, setData] = useState<{ name: string; value: number; key: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: residents } = await supabase.rpc("get_all_residents_for_staff");
        const counts: Record<string, number> = {};
        INCOME_BRACKETS.forEach((b) => (counts[b.key] = 0));

        (residents || []).forEach((r: any) => {
          const income = parseIncome(r.monthly_income_cash);
          if (income === null) {
            counts["unknown"]++;
            return;
          }
          for (const b of INCOME_BRACKETS) {
            if (b.key === "unknown") continue;
            if (income >= b.min && income <= b.max) {
              counts[b.key]++;
              break;
            }
          }
        });

        setData(
          INCOME_BRACKETS.map((b) => ({
            name: b.label,
            value: counts[b.key],
            key: b.key,
          })).filter((d) => d.value > 0)
        );
      } catch (e) {
        console.error("Error loading income data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Household Income Distribution
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total} residents</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No income data available</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((entry, index) => {
                    const bracketIndex = INCOME_BRACKETS.findIndex((b) => b.key === entry.key);
                    return <Cell key={entry.key} fill={COLORS[bracketIndex]} />;
                  })}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-xl font-bold"
                >
                  {total}
                </text>
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs w-full">
              {data.map((entry) => {
                const bracketIndex = INCOME_BRACKETS.findIndex((b) => b.key === entry.key);
                return (
                  <div key={entry.key} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: COLORS[bracketIndex] }}
                    />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                    <span className="ml-auto font-medium">{entry.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HouseholdIncomeChart;
