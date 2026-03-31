import { useState } from "react";
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
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Users, Eye, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  disputed:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AgentList() {
  const agents = useQuery(api.admin.listAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"users"> | null>(
    null,
  );

  return (
    <>
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
                <div
                  key={agent._id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedAgentId(agent._id)}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.email || "No email"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{agent.activeContributors} active / {agent.contributorCount} contributors</span>
                      <span>{agent.collectionCount} collections</span>
                    </div>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAgentId && (
        <AgentDetailDialog
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </>
  );
}

function AgentDetailDialog({
  agentId,
  onClose,
}: {
  agentId: Id<"users">;
  onClose: () => void;
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {detail?.agent.name ?? "Agent Details"}
          </DialogTitle>
          <DialogDescription>
            {detail?.agent.email || "No email"} &middot;{" "}
            {detail?.contributors.length ?? 0} contributors &middot;{" "}
            {detail?.collections.length ?? 0} collections
          </DialogDescription>
        </DialogHeader>

        {detail === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bulk action */}
            {pendingCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
                <p className="text-sm">
                  <span className="font-medium">{pendingCount}</span> pending
                  collection{pendingCount === 1 ? "" : "s"}
                </p>
                <Button
                  size="sm"
                  onClick={handleBulkConfirm}
                  disabled={confirming}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  {confirming ? "Confirming..." : "Confirm All"}
                </Button>
              </div>
            )}

            {/* Contributors */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Contributors</h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {detail.contributors.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-medium">
                        ₦{c.dailyAmount.toLocaleString()}/day
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          c.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent collections */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Recent Collections
              </h4>
              <div className="space-y-1.5">
                {detail.collections.slice(0, 20).map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium truncate">
                        {c.contributorName}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {c.referenceNumber}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[c.status] ?? ""}`}
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold">
                        ₦{c.amount.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(c.collectedAt), "h:mm a, MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
