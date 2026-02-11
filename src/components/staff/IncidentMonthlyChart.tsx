import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface IncidentData {
  incidentType: string;
  createdAt: string;
}

const INCIDENT_COLORS: Record<string, string> = {
  Theft: "hsl(0, 65%, 55%)",
  Dispute: "hsl(35, 85%, 55%)",
  Noise: "hsl(210, 70%, 50%)",
  Assault: "hsl(280, 55%, 55%)",
  Vandalism: "hsl(150, 60%, 45%)",
  Trespassing: "hsl(190, 65%, 50%)",
};

const getFallbackColor = (index: number) => {
  const fallbacks = [
    "hsl(var(--primary))",
    "hsl(60, 70%, 45%)",
    "hsl(320, 55%, 50%)",
    "hsl(100, 50%, 45%)",
    "hsl(240, 50%, 55%)",
    "hsl(15, 75%, 55%)",
  ];
  return fallbacks[index % fallbacks.length];
};

const IncidentMonthlyChart = ({ incidents }: { incidents: IncidentData[] }) => {
  const { chartData, incidentTypes } = useMemo(() => {
    const now = new Date();
    const months: { start: Date; end: Date; label: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      months.push({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
        label: format(monthDate, "MMM yyyy"),
      });
    }

    const typesSet = new Set<string>();
    incidents.forEach((inc) => {
      if (inc.incidentType) typesSet.add(inc.incidentType);
    });
    const incidentTypes = Array.from(typesSet).sort();

    const chartData = months.map((m) => {
      const row: Record<string, string | number> = { month: m.label };
      incidentTypes.forEach((t) => (row[t] = 0));

      incidents.forEach((inc) => {
        const d = new Date(inc.createdAt);
        if (!isNaN(d.getTime()) && isWithinInterval(d, { start: m.start, end: m.end })) {
          if (inc.incidentType) {
            row[inc.incidentType] = (row[inc.incidentType] as number) + 1;
          }
        }
      });

      return row;
    });

    return { chartData, incidentTypes };
  }, [incidents]);

  if (incidentTypes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Incidents by Type (Last 6 Months)
        </CardTitle>
        <CardDescription>Monthly breakdown by incident type</CardDescription>
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
              {incidentTypes.map((type, i) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="incidents"
                  fill={INCIDENT_COLORS[type] || getFallbackColor(i)}
                  radius={i === incidentTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentMonthlyChart;
