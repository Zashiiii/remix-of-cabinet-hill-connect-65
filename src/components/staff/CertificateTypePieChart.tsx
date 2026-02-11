import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

interface CertificateData {
  certificateType: string;
  createdAt: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 85%, 55%)",
  "hsl(280, 55%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(190, 65%, 50%)",
  "hsl(60, 70%, 45%)",
  "hsl(320, 55%, 50%)",
];

const CertificateTypePieChart = ({ certificates }: { certificates: CertificateData[] }) => {
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    certificates.forEach((c) => {
      if (c.certificateType) {
        counts[c.certificateType] = (counts[c.certificateType] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [certificates]);

  if (pieData.length === 0) return null;

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Certificate Types Distribution
        </CardTitle>
        <CardDescription>Total: {total} requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Pie chart */}
          <div className="h-[220px] w-[220px] flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={pieData.length > 1 ? 3 : 0}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} (${((value / total) * 100).toFixed(0)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{total}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Custom legend */}
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            {pieData.map((entry, i) => {
              const pct = ((entry.value / total) * 100).toFixed(0);
              return (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-foreground">{entry.name}</span>
                  <span className="ml-auto font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                    {entry.value} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateTypePieChart;
