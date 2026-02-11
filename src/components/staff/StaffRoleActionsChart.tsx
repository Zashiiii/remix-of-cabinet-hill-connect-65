import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ShieldCheck, Loader2 } from "lucide-react";
import { getAuditLogs } from "@/utils/staffApi";
import { subMonths, isAfter } from "date-fns";

const chartConfig = {
  actions: { label: "Actions", color: "hsl(var(--primary))" },
};

const StaffRoleActionsChart = () => {
  const [data, setData] = useState<{ role: string; actions: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const logs = await getAuditLogs(undefined, undefined, 5000);
        const oneMonthAgo = subMonths(new Date(), 1);

        const counts: Record<string, number> = {};
        (logs || []).forEach((log: any) => {
          const logDate = new Date(log.created_at);
          if (!isAfter(logDate, oneMonthAgo)) return;
          // Extract role from details or performed_by_type
          const role = log.performed_by_type || "unknown";
          const label = role.charAt(0).toUpperCase() + role.slice(1);
          counts[label] = (counts[label] || 0) + 1;
        });

        setData(
          Object.entries(counts)
            .map(([role, actions]) => ({ role, actions }))
            .sort((a, b) => b.actions - a.actions)
        );
      } catch (e) {
        console.error("Error loading staff role actions:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const total = data.reduce((s, d) => s + d.actions, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Actions by Staff Role (Past Month)
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total} actions</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No audit log data for the past month</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="role" tick={{ fontSize: 12 }} width={100} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="actions" fill="var(--color-actions)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffRoleActionsChart;
