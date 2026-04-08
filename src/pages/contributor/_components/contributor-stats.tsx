import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Banknote, CalendarCheck, TrendingUp, Target, Wallet } from "lucide-react";

type Frequency = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Frequency, string> = {
  daily: "Current Cycle",
  weekly: "Current Cycle",
  monthly: "Current Cycle",
};

export default function ContributorStats({
  contributorId,
}: {
  contributorId?: Id<"contributors">;
}) {
  const card = useQuery(
    api.collections.getMyCardSummary,
    contributorId ? { contributorId } : {},
  );

  if (card === undefined) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const freq: Frequency = card.frequency ?? "daily";
  const contributionSuffix =
    freq === "daily" ? "/day" : freq === "weekly" ? "/week" : "/month";

  const stats = [
    {
      label: "Total Saved",
      value: `₦${card.totalSaved.toLocaleString()}`,
      icon: Banknote,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Current Contribution",
      value: `₦${card.contributionAmount.toLocaleString()}${contributionSuffix}`,
      icon: Wallet,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "Periods Paid",
      value: `${card.daysPaid}/${freq === "daily" ? card.daysInMonth : freq === "weekly" ? (card.weeksInPeriod ?? 4) : 12}`,
      icon: CalendarCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/20",
    },
    {
      label: PERIOD_LABELS[freq],
      value: `₦${card.periodTotal.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "Cycle Target",
      value: `₦${card.periodTarget.toLocaleString()}`,
      icon: Target,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}
              >
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold font-serif truncate">
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
