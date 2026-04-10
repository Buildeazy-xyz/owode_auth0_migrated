import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  FileBadge2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
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
    return (
      <PendingApprovalScreen
        status={user.agentStatus}
        verification={verification}
        currentName={user.name}
      />
    );
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

      <AgentNameCard currentName={user.name} />

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

type AgentVerificationDetails = {
  status?: VerificationStatus;
  phone?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorAddress?: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  govIdUrl?: string | null;
  userName?: string;
  userEmail?: string;
};

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

function AgentNameCard({ currentName }: { currentName?: string }) {
  const saveAgentName = useMutation(api.users.setAgentDisplayName);
  const [draftName, setDraftName] = useState(currentName ?? "");
  const [saving, setSaving] = useState(false);
  const isLocked = Boolean(currentName?.trim());

  useEffect(() => {
    setDraftName(currentName ?? "");
  }, [currentName]);

  const handleSave = async () => {
    const trimmedName = draftName.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      toast.error("Please enter your full name first.");
      return;
    }

    setSaving(true);
    try {
      await saveAgentName({ name: trimmedName });
      toast.success("Your name has been saved and locked.");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message?: string };
        toast.error(data.message ?? "Failed to save your name.");
      } else {
        toast.error("Failed to save your name.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif">Agent name</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLocked
            ? "Your saved name is locked and cannot be changed."
            : "Add your name once here. After saving it, the name cannot be changed."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="agent-dashboard-name">Full name</Label>
          <Input
            id="agent-dashboard-name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Enter your full name"
            disabled={isLocked || saving}
          />
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isLocked || saving || !draftName.trim()}
        >
          {isLocked ? "Name locked" : saving ? "Saving..." : "Save name"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PendingApprovalScreen({
  status,
  verification,
  currentName,
}: {
  status: VerificationStatus | undefined;
  verification: AgentVerificationDetails | null | undefined;
  currentName?: string;
}) {
  const config = STATUS_CONFIG[status ?? "pending"] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className="space-y-6 py-20 px-4">
      <div className="mx-auto max-w-md">
        <AgentNameCard currentName={currentName} />
      </div>

      <Card className="max-w-md w-full mx-auto text-center">
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
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
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

function AgentRegistrationCard({
  user,
  verification,
  compact = false,
}: {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  verification: AgentVerificationDetails | null | undefined;
  compact?: boolean;
}) {
  if (verification === undefined) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (!verification) {
    return null;
  }

  const statusConfig =
    STATUS_CONFIG[verification.status ?? "pending"] ?? STATUS_CONFIG.pending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">
          {compact ? "Submitted Registration Details" : "Your Registration / Verification Details"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${statusConfig.badgeClass}`}>
            {verification.status ?? "pending"}
          </Badge>
          {verification.reviewedAt && (
            <span className="text-xs text-muted-foreground">
              Reviewed on {new Date(verification.reviewedAt).toLocaleDateString("en-NG")}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={UserRound}
            label="Full name"
            value={verification.userName || user?.name || "Not provided"}
          />
          <DetailItem
            icon={Mail}
            label="Email"
            value={verification.userEmail || user?.email || "Not provided"}
          />
          <DetailItem
            icon={Phone}
            label="Phone number"
            value={verification.phone || user?.phone || "Not provided"}
          />
          <DetailItem
            icon={UserRound}
            label="Guarantor name"
            value={verification.guarantorName || "Not provided"}
          />
          <DetailItem
            icon={Phone}
            label="Guarantor phone"
            value={verification.guarantorPhone || "Not provided"}
          />
          <DetailItem
            icon={FileBadge2}
            label="Submitted on"
            value={new Date(verification.submittedAt).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Guarantor address
          </div>
          <p className="text-sm text-muted-foreground">
            {verification.guarantorAddress || "Not provided"}
          </p>
        </div>

        {verification.govIdUrl && (
          <a
            href={verification.govIdUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <FileBadge2 className="h-4 w-4" />
            View uploaded government ID
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="text-sm text-muted-foreground wrap-break-word">{value}</p>
    </div>
  );
}
