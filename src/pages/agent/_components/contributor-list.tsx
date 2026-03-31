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
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Users } from "lucide-react";
import AddContributorDialog from "./add-contributor-dialog.tsx";

export default function ContributorList() {
  const contributors = useQuery(api.contributors.listByAgent);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-serif">Contributors</CardTitle>
        <AddContributorDialog />
      </CardHeader>
      <CardContent>
        {contributors === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : contributors.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No contributors yet</EmptyTitle>
              <EmptyDescription>
                Add your first contributor to start recording collections.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <AddContributorDialog />
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-2">
            {contributors.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium">
                    ₦{c.dailyAmount.toLocaleString()}/day
                  </span>
                  <Badge
                    variant={c.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
