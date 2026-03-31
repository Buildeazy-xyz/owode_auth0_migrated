import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Banknote, ClipboardList, Users } from "lucide-react";

export default function DashboardStats() {
  const summary = useQuery(api.collections.getTodaySummary);

  if (summary === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Today's Total",
      value: `₦${summary.todayTotal.toLocaleString()}`,
      icon: Banknote,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Collections Today",
      value: summary.todayCount.toString(),
      icon: ClipboardList,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Active Contributors",
      value: summary.activeContributors.toString(),
      icon: Users,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-serif">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
