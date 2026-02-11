import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface CertificateData {
  certificateType: string;
  createdAt: string;
}

const CERT_COLORS: Record<string, string> = {
  Indigency: "hsl(var(--primary))",
  Residency: "hsl(210, 70%, 50%)",
  Clearance: "hsl(150, 60%, 45%)",
  "Business Permit": "hsl(35, 85%, 55%)",
  "Good Moral": "hsl(280, 55%, 55%)",
};

const getFallbackColor = (index: number) => {
  const fallbacks = [
    "hsl(0, 65%, 55%)",
    "hsl(190, 65%, 50%)",
    "hsl(60, 70%, 45%)",
    "hsl(320, 55%, 50%)",
  ];
  return fallbacks[index % fallbacks.length];
};

const CertificateMonthlyChart = ({ certificates }: { certificates: CertificateData[] }) => {
  const { chartData, certTypes } = useMemo(() => {
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

    // Collect all unique certificate types
    const typesSet = new Set<string>();
    certificates.forEach((c) => {
      if (c.certificateType) typesSet.add(c.certificateType);
    });
    const certTypes = Array.from(typesSet).sort();

    const chartData = months.map((m) => {
      const row: Record<string, string | number> = { month: m.label };
      certTypes.forEach((t) => (row[t] = 0));

      certificates.forEach((c) => {
        const d = new Date(c.createdAt);
        if (!isNaN(d.getTime()) && isWithinInterval(d, { start: m.start, end: m.end })) {
          if (c.certificateType) {
            row[c.certificateType] = (row[c.certificateType] as number) + 1;
          }
        }
      });

      return row;
    });

    return { chartData, certTypes };
  }, [certificates]);

  if (certTypes.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Certificate Requests (Last 6 Months)
        </CardTitle>
        <CardDescription>Monthly breakdown by certificate type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {certTypes.map((type, i) => (
                <Bar
                  key={type}
                  dataKey={type}
                  fill={CERT_COLORS[type] || getFallbackColor(i)}
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

export default CertificateMonthlyChart;
