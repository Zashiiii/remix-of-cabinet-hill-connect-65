import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const BRACKETS = [
  { key: "0-17", label: "0–17", min: 0, max: 17 },
  { key: "18-30", label: "18–30", min: 18, max: 30 },
  { key: "31-60", label: "31–60", min: 31, max: 60 },
  { key: "60+", label: "60+", min: 61, max: Infinity },
];

const chartConfig = {
  count: { label: "Residents", color: "hsl(var(--primary))" },
};

const ResidentAgeBracketChart = () => {
  const [data, setData] = useState<{ bracket: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: residents } = await supabase.rpc("get_all_residents_for_staff");
        const counts: Record<string, number> = {};
        BRACKETS.forEach((b) => (counts[b.label] = 0));

        (residents || []).forEach((r: any) => {
          const age = calculateAge(r.birth_date);
          if (age === null) return;
          for (const b of BRACKETS) {
            if (age >= b.min && age <= b.max) {
              counts[b.label]++;
              break;
            }
          }
        });

        setData(BRACKETS.map((b) => ({ bracket: b.label, count: counts[b.label] })));
      } catch (e) {
        console.error("Error loading age brackets:", e);
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
          <Users className="h-4 w-4 text-primary" />
          Residents by Age Bracket
        </CardTitle>
        <p className="text-xs text-muted-foreground">Total: {total} residents</p>
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
              <XAxis dataKey="bracket" tick={{ fontSize: 12 }} />
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

export default ResidentAgeBracketChart;
