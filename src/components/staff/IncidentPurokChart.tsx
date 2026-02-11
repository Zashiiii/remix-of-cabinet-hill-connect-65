import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface IncidentData {
  incidentLocation?: string;
  rawCreatedAt: string;
}

const PUROK_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 85%, 55%)",
  "hsl(280, 55%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(190, 65%, 50%)",
  "hsl(60, 70%, 45%)",
  "hsl(320, 55%, 50%)",
  "hsl(100, 50%, 45%)",
];

const IncidentPurokChart = ({ incidents }: { incidents: IncidentData[] }) => {
  const { chartData, puroks } = useMemo(() => {
    const now = new Date();
    const months: { start: Date; end: Date; label: string }[] = [];

    for (let i = 2; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      months.push({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        label: format(monthDate, "MMM yyyy"),
      });
    }

    const purokSet = new Set<string>();
    incidents.forEach((inc) => {
      const loc = inc.incidentLocation?.trim();
      if (loc) purokSet.add(loc);
    });
    const puroks = Array.from(purokSet).sort();

    const chartData = months.map((m) => {
      const row: Record<string, string | number> = { month: m.label };
      puroks.forEach((p) => (row[p] = 0));

      incidents.forEach((inc) => {
        const loc = inc.incidentLocation?.trim();
        if (!loc) return;
        const d = new Date(inc.rawCreatedAt);
        if (!isNaN(d.getTime()) && isWithinInterval(d, { start: m.start, end: m.end })) {
          row[loc] = (row[loc] as number) + 1;
        }
      });

      return row;
    });

    return { chartData, puroks };
  }, [incidents]);

  if (puroks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Incidents per Purok (Last 3 Months)
        </CardTitle>
        <CardDescription>Location-based incident trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-xs fill-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-xs fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {puroks.map((purok, i) => (
                <Bar
                  key={purok}
                  dataKey={purok}
                  fill={PUROK_COLORS[i % PUROK_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentPurokChart;
