import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import CollectionReceipt from "./collection-receipt.tsx";

type ReceiptData = {
  referenceNumber: string;
  contributorName: string;
  amount: number;
  collectedAt: string;
  agentName: string;
};

export default function RecordCollectionDialog() {
  const [open, setOpen] = useState(false);
  const [contributorId, setContributorId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const contributors = useQuery(api.contributors.listByAgent);
  const currentUser = useQuery(api.users.getCurrentUser);
  const recordCollection = useMutation(api.collections.record);

  const activeContributors =
    contributors?.filter((c) => c.status === "active") ?? [];

  const handleContributorChange = (value: string) => {
    setContributorId(value);
    const contributor = activeContributors.find((c) => c._id === value);
    if (contributor) {
      setAmount(contributor.dailyAmount.toString());
    }
  };

  const resetForm = () => {
    setContributorId("");
    setAmount("");
    setNote("");
    setReceipt(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributorId || !amount) {
      toast.error("Please select a contributor and enter an amount");
      return;
    }

    setLoading(true);
    try {
      const result = await recordCollection({
        contributorId: contributorId as Id<"contributors">,
        amount: Number(amount),
        note: note || undefined,
      });

      const contributor = activeContributors.find(
        (c) => c._id === contributorId,
      );

      // Show receipt instead of closing
      setReceipt({
        referenceNumber: result.referenceNumber,
        contributorName: contributor?.name ?? "Unknown",
        amount: Number(amount),
        collectedAt: new Date().toISOString(),
        agentName: currentUser?.name ?? "Agent",
      });
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to record collection");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Record Collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        {receipt ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif">
                Collection Receipt
              </DialogTitle>
            </DialogHeader>
            <CollectionReceipt data={receipt} onClose={handleClose} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif">
                Record Collection
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Contributor</Label>
                <Select
                  value={contributorId}
                  onValueChange={handleContributorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeContributors.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name} (₦{c.dailyAmount.toLocaleString()}/day)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeContributors.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active contributors. Add a contributor first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection-amount">Amount (₦)</Label>
                <Input
                  id="collection-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  required
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection-note">Note (optional)</Label>
                <Textarea
                  id="collection-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || activeContributors.length === 0}
              >
                {loading ? "Recording..." : "Record Collection"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
