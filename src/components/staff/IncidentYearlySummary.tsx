import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface IncidentData {
  rawCreatedAt: string;
}

const IncidentYearlySummary = ({ incidents }: { incidents: IncidentData[] }) => {
  const { totalThisYear, chartData, trend } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    let totalThisYear = 0;
    incidents.forEach((inc) => {
      const d = new Date(inc.rawCreatedAt);
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) totalThisYear++;
    });

    // Build monthly data for the current year (up to current month)
    const months: { start: Date; end: Date; label: string }[] = [];
    for (let i = 0; i <= now.getMonth(); i++) {
      const monthDate = new Date(currentYear, i, 1);
      months.push({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        label: format(monthDate, "MMM"),
      });
    }

    const chartData = months.map((m) => {
      let count = 0;
      incidents.forEach((inc) => {
        const d = new Date(inc.rawCreatedAt);
        if (!isNaN(d.getTime()) && isWithinInterval(d, { start: m.start, end: m.end })) {
          count++;
        }
      });
      return { month: m.label, count };
    });

    // Trend: compare last 2 months with data
    let trend: "up" | "down" | "flat" = "flat";
    if (chartData.length >= 2) {
      const last = chartData[chartData.length - 1].count;
      const prev = chartData[chartData.length - 2].count;
      if (last > prev) trend = "up";
      else if (last < prev) trend = "down";
    }

    return { totalThisYear, chartData, trend };
  }, [incidents]);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-destructive"
      : trend === "down"
        ? "text-green-600 dark:text-green-400"
        : "text-muted-foreground";
  const trendLabel =
    trend === "up" ? "Increasing" : trend === "down" ? "Decreasing" : "Stable";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Incidents This Year
        </CardTitle>
        <CardDescription>{new Date().getFullYear()} overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-4xl font-bold text-foreground">{totalThisYear}</span>
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            {trendLabel}
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-xs fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-xs fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value} incidents`, "Count"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentYearlySummary;
