import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import VirtualCard from "./_components/virtual-card.tsx";
import ContributorStats from "./_components/contributor-stats.tsx";
import PaymentHistory from "./_components/payment-history.tsx";
import AgentInfo from "./_components/agent-info.tsx";

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

      {/* Virtual thrift card */}
      {cardSummary && (
        <VirtualCard
          daysInMonth={cardSummary.daysInMonth}
          currentDay={cardSummary.currentDay}
          paidDays={cardSummary.paidDays}
          dailyAmount={cardSummary.dailyAmount}
          monthTotal={cardSummary.monthTotal}
          monthTarget={cardSummary.monthTarget}
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
