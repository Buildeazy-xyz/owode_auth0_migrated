import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Mail,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const COLLECTION_STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  disputed:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const WITHDRAWAL_STATUS_STYLES: Record<string, string> = {
  submitted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const WITHDRAWAL_LABELS: Record<string, string> = {
  submitted: "Submitted",
  processing: "Processing",
  paid: "Approved",
  rejected: "Rejected",
};

export default function AgentList() {
  const agents = useQuery(api.admin.listAgents);
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-serif">Agents Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {agents === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No agents registered</EmptyTitle>
              <EmptyDescription>
                Agents will appear here once they sign up.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent._id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-4 text-left transition-colors hover:bg-muted/80"
                onClick={() => navigate(`/admin/agents/${agent._id}`)}
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-sm truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.email || "No email"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {agent.activeContributors} active / {agent.contributorCount} contributors
                    </span>
                    <span>{agent.collectionCount} collections</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="font-bold text-sm font-serif">
                      ₦{agent.totalCollected.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₦{agent.todayAmount.toLocaleString()} today
                    </p>
                    {agent.pendingAmount > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      >
                        ₦{agent.pendingAmount.toLocaleString()} pending
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentDetailPanel({
  agentId,
  onBack,
}: {
  agentId: Id<"users">;
  onBack: () => void;
}) {
  const detail = useQuery(api.admin.getAgentDetail, { agentId });
  const bulkConfirm = useMutation(api.admin.bulkConfirmByAgent);
  const [confirming, setConfirming] = useState(false);

  const handleBulkConfirm = async () => {
    setConfirming(true);
    try {
      const result = await bulkConfirm({ agentId });
      toast.success(`Confirmed ${result.confirmedCount} collection(s)`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to confirm collections");
      }
    } finally {
      setConfirming(false);
    }
  };

  const pendingCount =
    detail?.collections.filter((c) => c.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 gap-1 px-0">
            <ArrowLeft className="h-4 w-4" />
            Back to agents
          </Button>
          <h3 className="text-xl font-bold font-serif">
            {detail?.agent.name ?? "Agent Information Dashboard"}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {detail?.agent.email || "No email"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {detail?.agent.phone || "No phone"}
            </span>
          </div>
        </div>
        {pendingCount > 0 && (
          <Button size="sm" onClick={handleBulkConfirm} disabled={confirming}>
            <CheckCircle className="mr-1.5 h-4 w-4" />
            {confirming ? "Confirming..." : "Confirm pending collections"}
          </Button>
        )}
      </div>

      {detail === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Collected",
                value: `₦${detail.summary.totalCollected.toLocaleString()}`,
                detail: `₦${detail.summary.todayAmount.toLocaleString()} today`,
                icon: Banknote,
                bg: "bg-primary/10",
                color: "text-primary",
              },
              {
                label: "Contributors",
                value: detail.summary.contributorCount.toString(),
                detail: `${detail.summary.activeContributors} active contributors`,
                icon: Users,
                bg: "bg-green-100 dark:bg-green-900/20",
                color: "text-green-600 dark:text-green-400",
              },
              {
                label: "Collections",
                value: detail.summary.collectionCount.toString(),
                detail: `${detail.summary.pendingCollectionCount} pending • ${detail.summary.confirmedCollectionCount} confirmed`,
                icon: ClipboardList,
                bg: "bg-blue-100 dark:bg-blue-900/20",
                color: "text-blue-600 dark:text-blue-400",
              },
              {
                label: "Withdrawals",
                value: detail.summary.withdrawalCount.toString(),
                detail: `₦${detail.summary.approvedWithdrawalsTotal.toLocaleString()} approved payouts`,
                icon: Wallet,
                bg: "bg-orange-100 dark:bg-orange-900/20",
                color: "text-orange-600 dark:text-orange-400",
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="truncate text-xl font-bold font-serif">{item.value}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif">Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.contributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contributors have been assigned to this agent yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.contributors.map((contributor) => (
                      <div
                        key={contributor._id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{contributor.name}</p>
                          <p className="text-xs text-muted-foreground">{contributor.phone}</p>
                        </div>
                        <div className="flex items-center gap-2 pl-3">
                          <span className="text-xs font-medium">
                            ₦{contributor.dailyAmount.toLocaleString()}/day
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              contributor.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {contributor.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif">Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No withdrawal requests yet for this agent.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.withdrawals.slice(0, 12).map((withdrawal) => (
                      <div
                        key={withdrawal._id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{withdrawal.contributorName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {withdrawal.referenceNumber}
                          </p>
                        </div>
                        <div className="text-right pl-3">
                          <p className="font-semibold">₦{withdrawal.amount.toLocaleString()}</p>
                          <Badge
                            variant="secondary"
                            className={`mt-1 text-[10px] ${WITHDRAWAL_STATUS_STYLES[withdrawal.status] ?? ""}`}
                          >
                            {WITHDRAWAL_LABELS[withdrawal.status] ?? withdrawal.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif">Recent Collections</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No collections have been recorded for this agent yet.</p>
              ) : (
                <div className="space-y-2">
                  {detail.collections.slice(0, 20).map((collection) => (
                    <div
                      key={collection._id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{collection.contributorName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {collection.referenceNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pl-3">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${COLLECTION_STATUS_STYLES[collection.status] ?? ""}`}
                        >
                          {collection.status}
                        </Badge>
                        <div className="text-right">
                          <p className="font-semibold">₦{collection.amount.toLocaleString()}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(collection.collectedAt), "h:mm a, MMM d")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
