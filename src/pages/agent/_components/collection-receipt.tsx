import { format } from "date-fns";
import { CheckCircle, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";

type ReceiptData = {
  referenceNumber: string;
  contributorName: string;
  amount: number;
  collectedAt: string;
  agentName: string;
};

export default function CollectionReceipt({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose: () => void;
}) {
  const receiptText = [
    "OWODE Digital Services Ltd",
    "---",
    `Ref: ${data.referenceNumber}`,
    `Contributor: ${data.contributorName}`,
    `Amount: ₦${data.amount.toLocaleString()}`,
    `Date: ${format(new Date(data.collectedAt), "dd MMM yyyy, h:mm a")}`,
    `Agent: ${data.agentName}`,
    "---",
    "This is your digital proof of payment.",
  ].join("\n");

  const handleCopyRef = async () => {
    await navigator.clipboard.writeText(data.referenceNumber);
    toast.success("Reference number copied");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "OWODE Collection Receipt",
          text: receiptText,
        });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(receiptText);
      toast.success("Receipt copied to clipboard");
    }
  };

  return (
    <div className="space-y-6">
      {/* Success indicator */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-sm text-muted-foreground">Collection recorded</p>
      </div>

      {/* Receipt card */}
      <div className="bg-muted/50 rounded-xl p-5 space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Reference
          </span>
          <button
            onClick={handleCopyRef}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <p className="font-mono text-lg font-bold tracking-wide">
          {data.referenceNumber}
        </p>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contributor</span>
            <span className="font-medium">{data.contributorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-bold text-lg">
              ₦{data.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span>
              {format(new Date(data.collectedAt), "dd MMM yyyy, h:mm a")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Agent</span>
            <span>{data.agentName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1 gap-2" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
          Share Receipt
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
