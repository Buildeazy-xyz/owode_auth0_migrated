import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Banknote,
  ClipboardList,
  Users,
  ArrowRightLeft,
} from "lucide-react";

export default function DashboardStats() {
  const summary = useQuery(api.collections.getTodaySummary);

  if (summary === undefined) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
      detail: `${summary.todayCount} collection${summary.todayCount === 1 ? "" : "s"}`,
    },
    {
      label: "Cash",
      value: `₦${summary.cashTotal.toLocaleString()}`,
      icon: Banknote,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/20",
      detail: "Collected in person",
    },
    {
      label: "Bank Transfers",
      value: `₦${summary.transferTotal.toLocaleString()}`,
      icon: ArrowRightLeft,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/20",
      detail: "Sent via bank apps",
    },
    {
      label: "Active Contributors",
      value: summary.activeContributors.toString(),
      icon: Users,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      detail: `${summary.totalContributors} total`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="text-xl font-bold font-serif truncate">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stat.detail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
