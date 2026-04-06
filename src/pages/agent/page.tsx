import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Clock, ShieldCheck, XCircle, AlertTriangle } from "lucide-react";
import DashboardStats from "./_components/dashboard-stats.tsx";
import ContributorList from "./_components/contributor-list.tsx";
import CollectionHistory from "./_components/collection-history.tsx";
import RecordCollectionDialog from "./_components/record-collection-dialog.tsx";
import RequestWithdrawalDialog from "./_components/request-withdrawal-dialog.tsx";

export default function AgentDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const verification = useQuery(api.agentVerification.getMyVerification);
  const navigate = useNavigate();

  // Redirect if user doesn't have agent role
  useEffect(() => {
    if (user && user.role !== "agent") {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== "agent") {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  // Gate: agent must be approved to access the full dashboard
  if (user.agentStatus !== "approved") {
    return <PendingApprovalScreen status={user.agentStatus} verification={verification} />;
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name || "Agent"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RequestWithdrawalDialog />
          <RecordCollectionDialog />
        </div>
      </div>

      {/* Summary cards */}
      <DashboardStats />

      {/* Two-column layout for lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CollectionHistory />
        <ContributorList />
      </div>
    </div>
  );
}

// ─── Pending approval screen ──────────────────────────────────────

type VerificationStatus = "pending" | "under_review" | "approved" | "rejected";

const STATUS_CONFIG: Record<
  string,
  {
    icon: typeof Clock;
    title: string;
    description: string;
    color: string;
    badgeClass: string;
  }
> = {
  pending: {
    icon: Clock,
    title: "Application Submitted",
    description:
      "Your agent verification is pending review. An admin will review your application shortly.",
    color: "text-yellow-600 dark:text-yellow-400",
    badgeClass:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  under_review: {
    icon: ShieldCheck,
    title: "Under Review",
    description:
      "An admin is currently reviewing your application. You will be notified once a decision is made.",
    color: "text-blue-600 dark:text-blue-400",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  rejected: {
    icon: XCircle,
    title: "Application Rejected",
    description:
      "Unfortunately, your application was not approved. Please contact support for more information.",
    color: "text-red-600 dark:text-red-400",
    badgeClass:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

function PendingApprovalScreen({
  status,
  verification,
}: {
  status: VerificationStatus | undefined;
  verification: { rejectionReason?: string; submittedAt: string } | null | undefined;
}) {
  const config = STATUS_CONFIG[status ?? "pending"] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center py-20 px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div
            className={`w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-2`}
          >
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>
          <CardTitle className="text-xl font-serif">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{config.description}</p>
          <Badge
            variant="secondary"
            className={`text-xs ${config.badgeClass}`}
          >
            {status ?? "pending"}
          </Badge>

          {/* Show rejection reason if applicable */}
          {status === "rejected" && verification?.rejectionReason && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">
                    Reason for rejection
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {verification.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {verification?.submittedAt && (
            <p className="text-xs text-muted-foreground pt-2">
              Submitted on{" "}
              {new Date(verification.submittedAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
