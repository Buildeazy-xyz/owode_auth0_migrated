import { useEffect, useMemo, useState } from "react";
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
import { ClipboardCheck, Banknote, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import CollectionReceipt from "./collection-receipt.tsx";

type PaymentMethod = "cash" | "bank_transfer";

type ReceiptData = {
  referenceNumber: string;
  contributorName: string;
  amount: number;
  collectedAt: string;
  agentName: string;
  paymentMethod: PaymentMethod;
  bankReference?: string;
};

type RecordCollectionDialogProps = {
  defaultContributorId?: Id<"contributors"> | string;
  triggerLabel?: string;
};

export default function RecordCollectionDialog({
  defaultContributorId,
  triggerLabel = "Record Collection",
}: RecordCollectionDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [contributorId, setContributorId] = useState(defaultContributorId ?? "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [bankReference, setBankReference] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const contributors = useQuery(api.contributors.listByAgent);
  const currentUser = useQuery(api.users.getCurrentUser);
  const recordCollection = useMutation(api.collections.record);

  const activeContributors = useMemo(
    () => contributors?.filter((c) => c.status === "active") ?? [],
    [contributors],
  );

  const handleContributorChange = (value: string) => {
    setContributorId(value);
    const contributor = activeContributors.find((c) => c._id === value);
    if (contributor) {
      setAmount(contributor.dailyAmount.toString());
    }
  };

  const selectedContributor = activeContributors.find(
    (c) => c._id === contributorId,
  );
  const freq = (selectedContributor?.frequency ?? "daily") as "daily" | "weekly" | "monthly";
  const freqLabel: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };
  const freqPeriod: Record<string, string> = {
    daily: "/day",
    weekly: "/week",
    monthly: "/month",
  };

  useEffect(() => {
    if (!open || !defaultContributorId) {
      return;
    }

    const defaultValue = defaultContributorId.toString();
    setContributorId(defaultValue);
    const contributor = activeContributors.find((c) => c._id === defaultValue);
    if (contributor) {
      setAmount(contributor.dailyAmount.toString());
    }
  }, [defaultContributorId, activeContributors, open]);

  const resetForm = () => {
    const defaultValue = defaultContributorId?.toString() ?? "";
    setContributorId(defaultValue);
    const contributor = activeContributors.find((c) => c._id === defaultValue);
    setAmount(contributor ? contributor.dailyAmount.toString() : "");
    setPaymentMethod("cash");
    setBankReference("");
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
    if (paymentMethod === "bank_transfer" && !bankReference.trim()) {
      toast.error("Please enter the bank transfer reference");
      return;
    }

    setLoading(true);
    try {
      const result = await recordCollection({
        contributorId: contributorId as Id<"contributors">,
        amount: Number(amount),
        paymentMethod,
        bankReference:
          paymentMethod === "bank_transfer"
            ? bankReference.trim()
            : undefined,
        note: note || undefined,
      });

      const contributor = activeContributors.find(
        (c) => c._id === contributorId,
      );

      setReceipt({
        referenceNumber: result.referenceNumber,
        contributorName: contributor?.name ?? "Unknown",
        amount: Number(amount),
        collectedAt: new Date().toISOString(),
        agentName: currentUser?.name ?? "Agent",
        paymentMethod,
        bankReference:
          paymentMethod === "bank_transfer" ? bankReference.trim() : undefined,
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ClipboardCheck className="w-4 h-4" />
          {triggerLabel}
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
                {defaultContributorId ? (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    <p className="font-medium">
                      {selectedContributor?.name ?? "Selected contributor"}
                    </p>
                    {selectedContributor && (
                      <p className="text-xs text-muted-foreground">
                        ₦{selectedContributor.dailyAmount.toLocaleString()}
                        {freqPeriod[freq]} contribution
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <Select
                      value={contributorId}
                      onValueChange={handleContributorChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contributor" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeContributors.map((c) => {
                          const f = (c.frequency ?? "daily") as "daily" | "weekly" | "monthly";
                          const period = freqPeriod[f] ?? "/day";
                          return (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name} (₦{c.dailyAmount.toLocaleString()}{period})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {activeContributors.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No active contributors. Add a contributor first.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Payment method toggle */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                      paymentMethod === "cash"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                      paymentMethod === "bank_transfer"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Bank Transfer
                  </button>
                </div>
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
                {selectedContributor && (
                  <p className="text-xs text-muted-foreground">
                    {freqLabel[freq]} contribution: ₦{selectedContributor.dailyAmount.toLocaleString()}{freqPeriod[freq]}
                  </p>
                )}
              </div>

              {/* Bank reference field — only visible for transfers */}
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-2">
                  <Label htmlFor="bank-ref">
                    Bank Transfer Reference
                  </Label>
                  <Input
                    id="bank-ref"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="e.g. NIP/241231/ABC123..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the transaction reference or session ID from the
                    {"contributor's"} bank app.
                  </p>
                </div>
              )}

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
