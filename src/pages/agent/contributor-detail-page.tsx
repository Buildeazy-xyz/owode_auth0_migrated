import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  ArrowLeft,
  CalendarClock,
  Mail,
  Phone,
  Wallet,
} from "lucide-react";
import RecordCollectionDialog from "./_components/record-collection-dialog.tsx";
import VirtualCard from "../contributor/_components/virtual-card.tsx";
import ContributorStats from "../contributor/_components/contributor-stats.tsx";
import PaymentHistory from "../contributor/_components/payment-history.tsx";
import AgentInfo from "../contributor/_components/agent-info.tsx";

type Frequency = "daily" | "weekly" | "monthly";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getScheduleLabel(profile: {
  frequency?: string;
  weeklyDay?: number;
  monthlyDay?: number;
}) {
  const frequency = (profile.frequency ?? "daily") as Frequency;

  if (frequency === "weekly" && profile.weeklyDay !== undefined) {
    return `Every ${WEEKDAY_LABELS[profile.weeklyDay]}`;
  }

  if (frequency === "monthly" && profile.monthlyDay !== undefined) {
    return `Every ${profile.monthlyDay}${getOrdinalSuffix(profile.monthlyDay)}`;
  }

  return "Daily";
}

function getContributionSuffix(frequency?: string) {
  if (frequency === "weekly") return "/week";
  if (frequency === "monthly") return "/month";
  return "/day";
}

export default function AgentContributorDetailPage() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();
  const { contributorId } = useParams<{ contributorId: string }>();
  const typedContributorId = contributorId as Id<"contributors"> | undefined;
  const profile = useQuery(
    api.contributors.getMyProfile,
    typedContributorId ? { contributorId: typedContributorId } : "skip",
  );
  const cardSummary = useQuery(
    api.collections.getMyCardSummary,
    typedContributorId ? { contributorId: typedContributorId } : "skip",
  );

  if (!typedContributorId) {
    return <Navigate to="/agent" replace />;
  }

  if (user === undefined || profile === undefined || cardSummary === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || user.role !== "agent") {
    return <Navigate to="/onboarding" replace />;
  }

  if (!profile || !cardSummary) {
    return <Navigate to="/agent" replace />;
  }

  const contributionSuffix = getContributionSuffix(profile.frequency);
  const scheduleLabel = getScheduleLabel(profile);
  const statusClass =
    profile.status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-fit gap-2 px-0"
            onClick={() => navigate("/agent")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contributors
          </Button>

          <div>
            <h1 className="text-2xl font-bold font-serif">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">
              Contributor dashboard and payment view
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {profile.phone}
            </span>
            {profile.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {profile.email}
              </span>
            )}
            <Badge variant="secondary" className={statusClass}>
              {profile.status}
            </Badge>
          </div>
        </div>

        <RecordCollectionDialog
          defaultContributorId={typedContributorId}
          triggerLabel="Add Payment"
        />
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Contribution</p>
            <p className="mt-1 text-lg font-bold font-serif">
              ₦{profile.dailyAmount.toLocaleString()}
              {contributionSuffix}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Schedule</p>
            <p className="mt-1 text-sm font-medium">{scheduleLabel}</p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Start date</p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" />
              {profile.startDate
                ? new Date(profile.startDate).toLocaleDateString("en-NG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Not set"}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Total saved</p>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-bold font-serif">
              <Wallet className="h-4 w-4 text-primary" />
              ₦{cardSummary.totalSaved.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <VirtualCard
        frequency={cardSummary.frequency}
        contributionAmount={cardSummary.contributionAmount}
        daysInMonth={cardSummary.daysInMonth}
        currentDay={cardSummary.currentDay}
        paidDays={cardSummary.paidDays}
        periodTotal={cardSummary.periodTotal}
        periodTarget={cardSummary.periodTarget}
        paidWeeks={cardSummary.paidWeeks ?? undefined}
        weeksInPeriod={cardSummary.weeksInPeriod ?? undefined}
        currentWeek={cardSummary.currentWeek ?? undefined}
        weeklyDay={cardSummary.weeklyDay ?? undefined}
        paidMonths={cardSummary.paidMonths ?? undefined}
        currentMonth={cardSummary.currentMonth ?? undefined}
        monthlyDay={cardSummary.monthlyDay ?? undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <ContributorStats contributorId={typedContributorId} />
          <PaymentHistory
            contributorId={typedContributorId}
            title="Contributor Payment History"
          />
        </div>

        <AgentInfo contributorId={typedContributorId} />
      </div>
    </div>
  );
}
