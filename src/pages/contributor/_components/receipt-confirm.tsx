import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api.js';
import { Button } from '@/components/ui/button.tsx';

export default function ReceiptConfirm() {
  const pending = useQuery(api.withdrawals.myPendingReceipts);
  const confirm = useMutation(api.withdrawals.confirmReceipt);
  const [busy, setBusy] = useState<string | null>(null);

  if (!pending || pending.length === 0) return null;

  const answer = async (id: any, received: boolean) => {
    try {
      setBusy(id);
      await confirm({ requestId: id, received });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {pending.map((r: any) => (
        <div
          key={r._id}
          className="rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <p className="font-semibold text-amber-900">
            Did you receive your withdrawal?
          </p>
          <p className="text-sm text-amber-800 mt-1">
            ₦{Number(r.payoutAmount ?? r.amount).toLocaleString()} was sent to {r.bankName} • {r.accountNumber}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Reference: {r.referenceNumber}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => answer(r._id, true)}
              disabled={busy === r._id}
            >
              Yes, I received it
            </Button>
            <Button
              variant="outline"
              onClick={() => answer(r._id, false)}
              disabled={busy === r._id}
            >
              No, I have not
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
