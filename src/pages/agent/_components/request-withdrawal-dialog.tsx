import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

type WithdrawalMode = "full" | "partial";

type RequestWithdrawalDialogProps = {
  defaultContributorId?: Id<"contributors"> | string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

export default function RequestWithdrawalDialog({
  defaultContributorId,
  open,
  onOpenChange,
  trigger,
}: RequestWithdrawalDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const contributors = useQuery(api.contributors.listByAgent);
  const requestWithdrawal = useMutation(api.withdrawals.requestWithdrawal);

  const [contributorId, setContributorId] = useState(defaultContributorId ?? "");
  const [withdrawalMode, setWithdrawalMode] = useState<WithdrawalMode>("full");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const activeContributors =
    contributors?.filter((contributor) => contributor.status === "active") ?? [];

  const preview = useQuery(
    api.withdrawals.getPreview,
    contributorId
      ? {
          contributorId: contributorId as Id<"contributors">,
          amount:
            withdrawalMode === "partial" && amount
              ? Number(amount)
              : undefined,
          withdrawAll: withdrawalMode === "full",
        }
      : "skip",
  );

  useEffect(() => {
    if (!isOpen) return;
    setContributorId(defaultContributorId ?? "");
  }, [defaultContributorId, isOpen]);

  const resetForm = () => {
    setContributorId(defaultContributorId ?? "");
    setWithdrawalMode("full");
    setAmount("");
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setNote("");
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !contributorId ||
      !bankName ||
      !accountNumber ||
      !accountName ||
      (withdrawalMode === "partial" && !amount)
    ) {
      toast.error("Please fill in all withdrawal details");
      return;
    }

    setLoading(true);
    try {
      const result = await requestWithdrawal({
        contributorId: contributorId as Id<"contributors">,
        amount: withdrawalMode === "partial" ? Number(amount) : undefined,
        withdrawAll: withdrawalMode === "full",
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        note: note.trim() || undefined,
      });

      toast.success("Withdrawal request sent", {
        description: `Ref: ${result.referenceNumber}. Pay out: ₦${result.payoutAmount.toLocaleString()} after ₦${(
          result.contributionFee + result.penaltyFee
        ).toLocaleString()} in fees. Admin has been notified.`,
      });
      handleClose();
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String((error.data as { message?: string })?.message ?? "")
          : error instanceof Error
            ? error.message
            : "Failed to request withdrawal.";

      toast.error("Could not submit withdrawal", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => {
      if (!nextOpen) resetForm();
      setOpen(nextOpen);
    }}>
      {open === undefined ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="secondary" className="gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Request Withdrawal
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Request Withdrawal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label>Contributor</Label>
            <Select value={contributorId} onValueChange={setContributorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contributor" />
              </SelectTrigger>
              <SelectContent>
                {activeContributors.map((contributor) => (
                  <SelectItem key={contributor._id} value={contributor._id}>
                    {contributor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Withdrawal Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWithdrawalMode("full")}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  withdrawalMode === "full"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                Withdraw all
              </button>
              <button
                type="button"
                onClick={() => setWithdrawalMode("partial")}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  withdrawalMode === "partial"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                Partial amount
              </button>
            </div>
          </div>

          {withdrawalMode === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="withdrawal-amount">Amount to Withdraw (₦)</Label>
              <Input
                id="withdrawal-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="5000"
                required
              />
            </div>
          )}

          {preview && contributorId && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Total saved</p>
                  <p className="font-medium">₦{preview.totalSaved.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Available balance</p>
                  <p className="font-medium">₦{preview.availableBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Counted contribution days</p>
                  <p className="font-medium">{preview.contributionDays} day(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requested withdrawal</p>
                  <p className="font-medium">₦{preview.requestedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contribution fee</p>
                  <p className="font-medium">₦{preview.contributionFee.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Penalty fee</p>
                  <p className="font-medium">₦{preview.penaltyFee.toLocaleString()}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Contributor will receive</p>
                  <p className="text-base font-semibold text-green-700 dark:text-green-400">
                    ₦{preview.payoutAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="withdrawal-bank-name">Bank Name</Label>
            <Input
              id="withdrawal-bank-name"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Access Bank"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-account-name">Account Name</Label>
            <Input
              id="withdrawal-account-name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Adebayo Musa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-account-number">Account Number</Label>
            <Input
              id="withdrawal-account-number"
              inputMode="numeric"
              value={accountNumber}
              onChange={(event) =>
                setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="0123456789"
              maxLength={10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-note">Note (optional)</Label>
            <Textarea
              id="withdrawal-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Any extra details about this withdrawal request"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Full withdrawal is the default. If the contributor does not want all the money now, switch to partial withdrawal and enter the amount. Each recorded contribution counts as one day; penalty applies until day 25 and stops from day 26 upward. This request will also appear on the admin dashboard.
          </p>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading || activeContributors.length === 0}
          >
            <ArrowRightLeft className="w-4 h-4" />
            {loading ? "Sending request..." : "Submit withdrawal request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
