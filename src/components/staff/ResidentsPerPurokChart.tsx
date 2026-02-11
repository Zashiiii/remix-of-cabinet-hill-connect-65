import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const chartConfig = {
  count: { label: "Residents", color: "hsl(var(--primary))" },
};

const ResidentsPerPurokChart = () => {
  const [data, setData] = useState<{ purok: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [{ data: residents }, { data: households }] = await Promise.all([
          supabase.rpc("get_all_residents_for_staff"),
          supabase.rpc("get_all_households_for_staff"),
        ]);

        // Map household id to purok
        const householdPurok: Record<string, string> = {};
        (households || []).forEach((h: any) => {
          if (h.id && h.street_purok) {
            householdPurok[h.id] = h.street_purok;
          }
        });

        // Count residents per purok
        const counts: Record<string, number> = {};
        (residents || []).forEach((r: any) => {
          const purok = r.household_id ? householdPurok[r.household_id] : null;
          const label = purok || "Unassigned";
          counts[label] = (counts[label] || 0) + 1;
        });

        // Sort by purok name, keeping "Unassigned" last
        const sorted = Object.entries(counts)
          .map(([purok, count]) => ({ purok, count }))
          .sort((a, b) => {
            if (a.purok === "Unassigned") return 1;
            if (b.purok === "Unassigned") return -1;
            return a.purok.localeCompare(b.purok, undefined, { numeric: true });
          });

        setData(sorted);
      } catch (e) {
        console.error("Error loading residents per purok:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Residents per Purok
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total} residents</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="purok"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ResidentsPerPurokChart;
