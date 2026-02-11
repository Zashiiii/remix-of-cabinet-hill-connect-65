import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  completed: "hsl(150, 60%, 45%)",
  pending: "hsl(var(--muted))",
};

const EcologicalCompletionCard = () => {
  const [totalHouseholds, setTotalHouseholds] = useState(0);
  const [completedHouseholds, setCompletedHouseholds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [householdsRes, submissionsRes] = await Promise.all([
          supabase.rpc("get_all_households_for_staff"),
          supabase.rpc("get_all_ecological_submissions_for_staff", {
            p_status: "approved",
            p_include_deleted: false,
          }),
        ]);

        const households = householdsRes.data || [];
        const submissions = submissionsRes.data || [];

        // Count unique household_ids with approved submissions
        const completedIds = new Set<string>();
        submissions.forEach((s: any) => {
          if (s.household_id) completedIds.add(s.household_id);
        });

        setTotalHouseholds(households.length);
        setCompletedHouseholds(completedIds.size);
      } catch (err) {
        console.error("Error loading ecological completion data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const remaining = Math.max(0, totalHouseholds - completedHouseholds);
  const pct = totalHouseholds > 0 ? Math.round((completedHouseholds / totalHouseholds) * 100) : 0;

  const pieData = [
    { name: "Completed", value: completedHouseholds },
    { name: "Not Submitted", value: remaining },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          Ecological Profile Completion
        </CardTitle>
        <CardDescription>Households with approved submissions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Mini donut */}
            <div className="relative h-[140px] w-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={totalHouseholds > 0 && completedHouseholds < totalHouseholds ? 3 : 0}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    <Cell fill={COLORS.completed} />
                    <Cell fill={COLORS.pending} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">{pct}%</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS.completed }} />
                <span className="text-sm text-foreground">Completed</span>
                <span className="ml-auto font-semibold tabular-nums text-foreground">{completedHouseholds}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm flex-shrink-0 bg-muted" />
                <span className="text-sm text-foreground">Not Submitted</span>
                <span className="ml-auto font-semibold tabular-nums text-muted-foreground">{remaining}</span>
              </div>
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">Total Households: {totalHouseholds}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EcologicalCompletionCard;
