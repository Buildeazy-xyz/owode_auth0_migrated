import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import VirtualCard from "./_components/virtual-card.tsx";
import ContributorStats from "./_components/contributor-stats.tsx";
import PaymentHistory from "./_components/payment-history.tsx";
import AgentInfo from "./_components/agent-info.tsx";
import ReceiptConfirm from "./_components/receipt-confirm.tsx";

export default function ContributorDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const cardSummary = useQuery(
    api.collections.getMyCardSummary,
    user?.role === "contributor" ? {} : "skip",
  );
  const profile = useQuery(
    api.contributors.getMyProfile,
    user?.role === "contributor" ? {} : "skip",
  );
  const navigate = useNavigate();

  // Redirect if user doesn't have contributor role
  useEffect(() => {
    if (user && user.role !== "contributor") {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== "contributor") {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }


  // Someone who signed themselves up has no agent and no plan yet.
  if (profile && profile.status === 'inactive' && !profile.dailyAmount) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">
            Hello, {profile.name}
          </h1>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 space-y-2">
          <p className="font-semibold text-amber-900">
            You are awaiting an agent
          </p>
          <p className="text-sm text-amber-800">
            OWODE is reviewing your registration and will assign you an agent
            shortly. Your agent will agree your contribution amount with you,
            and your card will appear here once that is done.
          </p>
          <p className="text-xs text-amber-700 pt-2">
            We will contact you on {profile.phone}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold font-serif">
          Hello, {profile?.name ?? user.name ?? "Contributor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your digital thrift card
        </p>
      </div>

      {/* Awaiting confirmation that a withdrawal arrived */}
      <ReceiptConfirm />

      {/* Virtual thrift card */}
      {cardSummary && (
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
      )}

      {/* Quick stats */}
      <ContributorStats />

      {/* Agent info */}
      <AgentInfo />

      {/* Payment history */}
      <PaymentHistory />
    </div>
  );
}
