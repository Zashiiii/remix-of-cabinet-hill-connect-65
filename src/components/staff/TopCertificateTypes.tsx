import { useMemo } from "react";
import { Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CertificateData {
  certificateType: string;
  createdAt: string;
}

const RANK_STYLES = [
  { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", badge: "bg-yellow-500" },
  { bg: "bg-slate-100 dark:bg-slate-800/50", text: "text-slate-600 dark:text-slate-300", badge: "bg-slate-400" },
  { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", badge: "bg-amber-600" },
];

const TopCertificateTypes = ({ certificates }: { certificates: CertificateData[] }) => {
  const topTypes = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const counts: Record<string, number> = {};

    certificates.forEach((c) => {
      if (!c.certificateType || !c.createdAt) return;
      const d = new Date(c.createdAt);
      if (isNaN(d.getTime()) || d.getFullYear() !== currentYear) return;
      counts[c.certificateType] = (counts[c.certificateType] || 0) + 1;
    });

    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? ((value / total) * 100).toFixed(0) : "0",
      }));
  }, [certificates]);

  if (topTypes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Requested This Year
        </CardTitle>
        <CardDescription>{new Date().getFullYear()} most popular certificate types</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {topTypes.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 rounded-lg p-3 ${RANK_STYLES[i]?.bg ?? "bg-muted"}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${RANK_STYLES[i]?.badge ?? "bg-muted-foreground"}`}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold truncate ${RANK_STYLES[i]?.text ?? "text-foreground"}`}>
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.value} requests · {item.pct}% of total
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {item.value}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TopCertificateTypes;
