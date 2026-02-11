import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity, Loader2 } from "lucide-react";
import { getAuditLogs } from "@/utils/staffApi";
import { subDays, isAfter, getHours } from "date-fns";

const chartConfig = {
  staff: { label: "Staff", color: "hsl(var(--primary))" },
  resident: { label: "Resident", color: "hsl(var(--accent))" },
};

const LoginActivityChart = () => {
  const [data, setData] = useState<{ hour: string; staff: number; resident: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const logs = await getAuditLogs(undefined, undefined, 5000);
        const thirtyDaysAgo = subDays(new Date(), 30);

        // Initialize 24 hour buckets
        const hourly: { staff: number; resident: number }[] = Array.from({ length: 24 }, () => ({
          staff: 0,
          resident: 0,
        }));

        (logs || []).forEach((log: any) => {
          if (log.action !== "login" && log.action !== "logout") return;
          const logDate = new Date(log.created_at);
          if (!isAfter(logDate, thirtyDaysAgo)) return;
          const hour = getHours(logDate);
          const type = log.performed_by_type === "staff" ? "staff" : "resident";
          hourly[hour][type]++;
        });

        setData(
          hourly.map((h, i) => ({
            hour: `${i.toString().padStart(2, "0")}:00`,
            staff: h.staff,
            resident: h.resident,
          }))
        );
      } catch (e) {
        console.error("Error loading login activity:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const total = data.reduce((s, d) => s + d.staff + d.resident, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Login/Logout Activity by Hour (Past 30 Days)
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total} events</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="staff" stackId="a" fill="var(--color-staff)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="resident" stackId="a" fill="var(--color-resident)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginActivityChart;
