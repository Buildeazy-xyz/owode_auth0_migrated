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
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Clock,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type StatusFilter = "pending" | "under_review" | "approved" | "rejected" | undefined;

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_review:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Reviewing", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

type VerificationItem = {
  _id: Id<"agent_verifications">;
  userId: Id<"users">;
  userName: string;
  userEmail: string;
  phone: string;
  govIdUrl: string | null;
  guarantorName: string;
  guarantorPhone: string;
  guarantorAddress: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

export default function VerificationQueue() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedId, setSelectedId] = useState<Id<"agent_verifications"> | null>(null);

  const verifications = useQuery(api.agentVerification.listVerifications, {
    statusFilter,
  });

  // Find the currently selected verification from the live query data
  const selected = verifications?.find((v) => v._id === selectedId) ?? null;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg font-serif">
              Agent Verification Queue
            </CardTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  size="sm"
                  variant={statusFilter === opt.value ? "default" : "secondary"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {verifications === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck />
                </EmptyMedia>
                <EmptyTitle>No applications</EmptyTitle>
                <EmptyDescription>
                  {statusFilter
                    ? `No ${statusFilter.replace("_", " ")} applications found.`
                    : "All agent applications will appear here."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {verifications.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(item._id)}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {item.userName}
                      </p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[item.status] ?? ""}`}
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.phone} &middot; {item.userEmail || "No email"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.submittedAt), "MMM d, yyyy")}
                    </p>
                    <Button size="sm" variant="ghost" className="h-7 mt-1">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <ReviewVerificationDialog
          verification={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

// ─── Review Dialog ────────────────────────────────────────────────

function ReviewVerificationDialog({
  verification,
  onClose,
}: {
  verification: VerificationItem;
  onClose: () => void;
}) {
  const approveAgent = useMutation(api.agentVerification.approve);
  const rejectAgent = useMutation(api.agentVerification.reject);
  const markReview = useMutation(api.agentVerification.markUnderReview);

  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveAgent({ verificationId: verification._id });
      toast.success(`${verification.userName} approved as agent`);
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to approve agent");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setLoading(true);
    try {
      await rejectAgent({
        verificationId: verification._id,
        reason: rejectionReason,
      });
      toast.success(`${verification.userName} rejected`);
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to reject agent");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReview = async () => {
    try {
      await markReview({ verificationId: verification._id });
      toast.success("Marked as under review");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to update status");
      }
    }
  };

  const isActionable =
    verification.status === "pending" ||
    verification.status === "under_review";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Review Agent Application
          </DialogTitle>
          <DialogDescription>
            {verification.userName} &middot; submitted{" "}
            {format(new Date(verification.submittedAt), "MMM d, yyyy h:mm a")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Applicant info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{verification.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{verification.userEmail || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{verification.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="secondary"
                className={`text-xs ${STATUS_STYLES[verification.status] ?? ""}`}
              >
                {verification.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {/* Government ID */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Government ID</p>
            {verification.govIdUrl ? (
              <a
                href={verification.govIdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-primary font-medium">
                  View uploaded ID document
                </span>
              </a>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Document unavailable
              </p>
            )}
          </div>

          {/* Guarantor details */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Guarantor Details</p>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">
                  {verification.guarantorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{verification.guarantorPhone}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">
                  Address
                </span>
                <p className="text-sm">{verification.guarantorAddress}</p>
              </div>
            </div>
          </div>

          {/* Rejection reason (existing) */}
          {verification.rejectionReason && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-sm">
              <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
                Previous rejection reason
              </p>
              <p className="text-red-700 dark:text-red-400">
                {verification.rejectionReason}
              </p>
            </div>
          )}

          {/* Rejection reason input */}
          {isActionable && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Rejection reason (required to reject)
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason if rejecting..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Action buttons — always visible at bottom */}
        {isActionable && (
          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            {verification.status === "pending" && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-1.5"
                onClick={handleMarkReview}
                disabled={loading}
              >
                <Clock className="w-4 h-4" />
                Mark as Under Review
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleReject}
                disabled={loading}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleApprove}
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
