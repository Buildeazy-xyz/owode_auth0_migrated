import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Banknote,
  Users,
  UserCheck,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRightLeft,
} from "lucide-react";

export default function PlatformStats() {
  const stats = useQuery(api.admin.getPlatformStats);

  if (stats === undefined) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Today's Total",
      value: `₦${stats.todayTotal.toLocaleString()}`,
      icon: Banknote,
      color: "text-primary",
      bg: "bg-primary/10",
      detail: `${stats.todayCount} collection${stats.todayCount === 1 ? "" : "s"} today`,
    },
    {
      label: "All-time Volume",
      value: `₦${stats.totalAmount.toLocaleString()}`,
      icon: Banknote,
      color: "text-accent-foreground",
      bg: "bg-accent/20",
      detail: `${stats.totalCollections} total collections`,
    },
    {
      label: "Cash Collected",
      value: `₦${stats.cashTotal.toLocaleString()}`,
      icon: Banknote,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/20",
      detail: "In-person cash",
    },
    {
      label: "Bank Transfers",
      value: `₦${stats.transferTotal.toLocaleString()}`,
      icon: ArrowRightLeft,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/20",
      detail: "Via bank apps",
    },
    {
      label: "Active Agents",
      value: stats.agentCount.toString(),
      icon: UserCheck,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      detail: "Registered agents",
    },
    {
      label: "Contributors",
      value: stats.contributorCount.toString(),
      icon: Users,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      detail: `${stats.activeContributorCount} active`,
    },
    {
      label: "Pending Review",
      value: stats.pendingCount.toString(),
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      detail: "Awaiting confirmation",
    },
    {
      label: "Disputed",
      value: stats.disputedCount.toString(),
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/20",
      detail: `${stats.confirmedCount} confirmed`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {card.label}
                </p>
                <p className="text-xl font-bold font-serif truncate">
                  {card.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {card.detail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
