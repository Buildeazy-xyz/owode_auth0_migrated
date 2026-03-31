import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  ClipboardList,
  Banknote,
  ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  disputed:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function CollectionHistory() {
  const collections = useQuery(api.collections.listByAgent, { limit: 20 });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-serif">
          Recent Collections
        </CardTitle>
      </CardHeader>
      <CardContent>
        {collections === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>No collections yet</EmptyTitle>
              <EmptyDescription>
                Record your first collection to see it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {collections.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {c.contributorName}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[c.status] ?? ""}`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {c.referenceNumber}
                    </p>
                    {/* Payment method indicator */}
                    {c.paymentMethod === "bank_transfer" ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                        <ArrowRightLeft className="w-3 h-3" />
                        Transfer
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] text-green-700 dark:text-green-400">
                        <Banknote className="w-3 h-3" />
                        Cash
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">
                    ₦{c.amount.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(c.collectedAt), "h:mm a, MMM d")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
