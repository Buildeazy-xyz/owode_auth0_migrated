import { useState } from "react";
import { usePaginatedQuery, useMutation } from "convex/react";
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
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  ClipboardList,
  Banknote,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type StatusFilter = "pending" | "confirmed" | "disputed" | undefined;

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  disputed:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Disputed", value: "disputed" },
];

type CollectionItem = {
  _id: Id<"collections">;
  contributorName: string;
  contributorPhone: string;
  agentName: string;
  amount: number;
  collectedAt: string;
  referenceNumber: string;
  status: "pending" | "confirmed" | "disputed";
  paymentMethod: "cash" | "bank_transfer";
  bankReference?: string;
  note?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export default function CollectionsTable() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionItem | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listCollections,
    { statusFilter },
    { initialNumItems: 25 },
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg font-serif">
              All Collections
            </CardTitle>
            <div className="flex items-center gap-1.5">
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
          {status === "LoadingFirstPage" ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !results || results.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>No collections found</EmptyTitle>
                <EmptyDescription>
                  {statusFilter
                    ? `No ${statusFilter} collections. Try a different filter.`
                    : "Collections will appear here once agents start recording."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
                <div className="col-span-3">Contributor</div>
                <div className="col-span-2">Agent</div>
                <div className="col-span-2">Reference</div>
                <div className="col-span-1">Method</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1 text-right">Date</div>
              </div>

              <div className="space-y-1.5">
                {results.map((c) => {
                  const collection = c as CollectionItem;
                  return (
                    <div
                      key={collection._id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer items-center"
                      onClick={() => setSelectedCollection(collection)}
                    >
                      {/* Mobile layout */}
                      <div className="md:hidden space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {collection.contributorName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {collection.agentName}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-sm">
                              ₦{collection.amount.toLocaleString()}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[collection.status] ?? ""}`}
                            >
                              {collection.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">
                            {collection.referenceNumber}
                          </span>
                          <span>
                            {format(
                              new Date(collection.collectedAt),
                              "MMM d, h:mm a",
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden md:block col-span-3 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {collection.contributorName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {collection.contributorPhone}
                        </p>
                      </div>
                      <div className="hidden md:block col-span-2 min-w-0">
                        <p className="text-sm truncate">
                          {collection.agentName}
                        </p>
                      </div>
                      <div className="hidden md:block col-span-2">
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {collection.referenceNumber}
                        </p>
                      </div>
                      <div className="hidden md:block col-span-1">
                        {collection.paymentMethod === "bank_transfer" ? (
                          <span className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                            <ArrowRightLeft className="w-3 h-3" />
                            Transfer
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[11px] text-green-700 dark:text-green-400">
                            <Banknote className="w-3 h-3" />
                            Cash
                          </span>
                        )}
                      </div>
                      <div className="hidden md:block col-span-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[collection.status] ?? ""}`}
                        >
                          {collection.status}
                        </Badge>
                      </div>
                      <div className="hidden md:block col-span-2 text-right">
                        <p className="font-semibold text-sm">
                          ₦{collection.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="hidden md:block col-span-1 text-right">
                        <p className="text-[11px] text-muted-foreground">
                          {format(
                            new Date(collection.collectedAt),
                            "MMM d",
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {status === "CanLoadMore" && (
                <div className="flex justify-center pt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => loadMore(25)}
                  >
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedCollection && (
        <ReviewDialog
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
        />
      )}
    </>
  );
}

// ─── Review Dialog ────────────────────────────────────────────────

function ReviewDialog({
  collection,
  onClose,
}: {
  collection: CollectionItem;
  onClose: () => void;
}) {
  const confirmCollection = useMutation(api.admin.confirmCollection);
  const disputeCollection = useMutation(api.admin.disputeCollection);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmCollection({
        collectionId: collection._id,
        note: note || undefined,
      });
      toast.success("Collection confirmed");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to confirm collection");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!note.trim()) {
      toast.error("Please provide a reason for disputing");
      return;
    }
    setLoading(true);
    try {
      await disputeCollection({
        collectionId: collection._id,
        note,
      });
      toast.success("Collection disputed");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to dispute collection");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Review Collection</DialogTitle>
          <DialogDescription>
            Ref: {collection.referenceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Collection details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contributor</span>
              <span className="font-medium">{collection.contributorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent</span>
              <span className="font-medium">{collection.agentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold font-serif">
                ₦{collection.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>
                {format(
                  new Date(collection.collectedAt),
                  "MMM d, yyyy h:mm a",
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="capitalize">
                {collection.paymentMethod === "bank_transfer"
                  ? "Bank Transfer"
                  : "Cash"}
              </span>
            </div>
            {collection.bankReference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank Ref</span>
                <span className="font-mono text-xs">
                  {collection.bankReference}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="secondary"
                className={`text-xs ${STATUS_STYLES[collection.status] ?? ""}`}
              >
                {collection.status}
              </Badge>
            </div>
            {collection.note && (
              <div className="pt-1">
                <span className="text-muted-foreground block text-xs mb-1">
                  Agent note
                </span>
                <p className="text-sm bg-muted/50 p-2 rounded-md">
                  {collection.note}
                </p>
              </div>
            )}
            {collection.reviewNote && (
              <div className="pt-1">
                <span className="text-muted-foreground block text-xs mb-1">
                  Review note
                </span>
                <p className="text-sm bg-muted/50 p-2 rounded-md">
                  {collection.reviewNote}
                </p>
              </div>
            )}
          </div>

          {/* Admin review note */}
          {collection.status !== "confirmed" && (
            <div className="space-y-2">
              <Label htmlFor="review-note">Admin Note</Label>
              <Textarea
                id="review-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  collection.status === "disputed"
                    ? "Add a note (required to dispute)..."
                    : "Optional note..."
                }
                rows={3}
              />
            </div>
          )}
        </div>

        {collection.status !== "confirmed" && (
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDispute}
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Dispute
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={loading}>
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Confirm
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
