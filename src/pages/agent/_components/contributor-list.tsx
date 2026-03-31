import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import {
  Users,
  MoreVertical,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import AddContributorDialog from "./add-contributor-dialog.tsx";

export default function ContributorList() {
  const contributors = useQuery(api.contributors.listByAgent);
  const [editContributor, setEditContributor] =
    useState<Doc<"contributors"> | null>(null);

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
              <ContributorRow
                key={c._id}
                contributor={c}
                onEdit={() => setEditContributor(c)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {editContributor && (
        <EditContributorDialog
          contributor={editContributor}
          open={!!editContributor}
          onClose={() => setEditContributor(null)}
        />
      )}
    </Card>
  );
}

function ContributorRow({
  contributor,
  onEdit,
}: {
  contributor: Doc<"contributors">;
  onEdit: () => void;
}) {
  const toggleStatus = useMutation(api.contributors.toggleStatus);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const newStatus = await toggleStatus({
        contributorId: contributor._id,
      });
      toast.success(
        `${contributor.name} is now ${newStatus as string}`,
      );
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to update status");
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{contributor.name}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" />
          {contributor.phone}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-medium hidden sm:block">
          ₦{contributor.dailyAmount.toLocaleString()}/day
        </span>
        <Badge
          variant={contributor.status === "active" ? "default" : "secondary"}
          className="text-xs"
        >
          {contributor.status}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggle} disabled={toggling}>
              {contributor.status === "active" ? (
                <>
                  <ToggleLeft className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <ToggleRight className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EditContributorDialog({
  contributor,
  open,
  onClose,
}: {
  contributor: Doc<"contributors">;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(contributor.name);
  const [phone, setPhone] = useState(contributor.phone);
  const [dailyAmount, setDailyAmount] = useState(
    contributor.dailyAmount.toString(),
  );
  const [loading, setLoading] = useState(false);

  const updateContributor = useMutation(api.contributors.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !dailyAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await updateContributor({
        contributorId: contributor._id,
        name,
        phone,
        dailyAmount: Number(dailyAmount),
      });
      toast.success("Contributor updated");
      onClose();
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to update contributor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Contributor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Daily Contribution (₦)</Label>
            <Input
              id="edit-amount"
              type="number"
              value={dailyAmount}
              onChange={(e) => setDailyAmount(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
