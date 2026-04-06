import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type WithdrawalStatus = "submitted" | "processing" | "paid" | "rejected";

const STATUS_STYLES: Record<WithdrawalStatus, string> = {
  submitted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

type Filter = WithdrawalStatus | "all";

type WithdrawalItem = {
  _id: Id<"withdrawal_requests">;
  contributorName: string;
  contributorPhone: string;
  agentName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  requestedAt: string;
  referenceNumber: string;
  status: WithdrawalStatus;
  note?: string;
  reviewNote?: string;
  payoutAmount?: number;
  contributionDaysAtRequest?: number;
  contributionFee?: number;
  penaltyFee?: number;
};

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Processing", value: "processing" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "rejected" },
];

export default function WithdrawalsTable() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<WithdrawalItem | null>(null);

  const requests = useQuery(api.withdrawals.listForAdmin, {
    statusFilter: filter === "all" ? undefined : filter,
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-serif">Withdrawal Requests</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={filter === item.value ? "default" : "secondary"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requests === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArrowRightLeft />
                </EmptyMedia>
                <EmptyTitle>No withdrawal requests</EmptyTitle>
                <EmptyDescription>
                  Agent payout requests will appear here for admin review.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => {
                const payout = request.payoutAmount ?? request.amount;
                const fees = (request.contributionFee ?? 0) + (request.penaltyFee ?? 0);
                return (
                  <div
                    key={request._id}
                    className="cursor-pointer rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted/80"
                    onClick={() => setSelected(request as WithdrawalItem)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{request.contributorName}</p>
                        <p className="text-xs text-muted-foreground">
                          via {request.agentName} • {request.contributorPhone}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                          {request.referenceNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">₦{request.amount.toLocaleString()}</p>
                        <Badge
                          variant="secondary"
                          className={`mt-1 text-[10px] px-1.5 py-0 ${STATUS_STYLES[request.status]}`}
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Pay out: ₦{payout.toLocaleString()}</span>
                      <span>Fees: ₦{fees.toLocaleString()}</span>
                      <span>Counted days: {request.contributionDaysAtRequest ?? 0}</span>
                      <span>{format(new Date(request.requestedAt), "MMM d, h:mm a")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <ReviewWithdrawalDialog
          request={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ReviewWithdrawalDialog({
  request,
  onClose,
}: {
  request: WithdrawalItem;
  onClose: () => void;
}) {
  const reviewRequest = useMutation(api.withdrawals.reviewRequest);
  const [note, setNote] = useState(request.reviewNote ?? "");
  const [loading, setLoading] = useState(false);

  const handleAction = async (
    action: "processing" | "paid" | "rejected",
  ) => {
    setLoading(true);
    try {
      const result = await reviewRequest({
        requestId: request._id,
        action,
        note: note.trim() || undefined,
      });

      toast.success(
        action === "paid"
          ? `Withdrawal approved. ₦${(result.payoutAmount ?? request.amount).toLocaleString()} deducted from company balance.`
          : action === "rejected"
            ? "Withdrawal rejected"
            : "Withdrawal marked as processing",
      );
      onClose();
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String((error.data as { message?: string })?.message ?? "")
          : error instanceof Error
            ? error.message
            : "Could not review this withdrawal request.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const payoutAmount = request.payoutAmount ?? request.amount;
  const contributionFee = request.contributionFee ?? 0;
  const penaltyFee = request.penaltyFee ?? 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Withdrawal Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Contributor</p>
              <p className="font-medium">{request.contributorName}</p>
              <p className="text-xs text-muted-foreground">{request.contributorPhone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Agent</p>
              <p className="font-medium">{request.agentName}</p>
              <p className="text-xs text-muted-foreground">{request.referenceNumber}</p>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Requested amount</p>
              <p className="font-semibold">₦{request.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pay out to contributor</p>
              <p className="font-semibold text-green-700 dark:text-green-400">
                ₦{payoutAmount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Contribution fee</p>
              <p>₦{contributionFee.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Penalty fee</p>
              <p>₦{penaltyFee.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Counted contribution days</p>
              <p>{request.contributionDaysAtRequest ?? 0} day(s)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant="secondary" className={STATUS_STYLES[request.status]}>
                {request.status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Bank name</p>
              <p>{request.bankName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account name</p>
              <p>{request.accountName}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Account number</p>
              <p className="font-mono">{request.accountNumber}</p>
            </div>
          </div>

          {request.note && (
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Agent note</p>
              <p>{request.note}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="withdrawal-review-note">Admin note (optional)</Label>
            <Textarea
              id="withdrawal-review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Add an internal note for this payout"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAction("processing")}
              disabled={loading}
              className="gap-2"
            >
              <Clock3 className="w-4 h-4" />
              Mark processing
            </Button>
            <Button
              type="button"
              onClick={() => handleAction("paid")}
              disabled={loading}
              className="gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve & mark paid
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleAction("rejected")}
              disabled={loading}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Once marked as paid, the payout amount is deducted from the company balance shown on the admin dashboard.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
