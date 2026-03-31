import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
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
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

export default function AddContributorDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dailyAmount, setDailyAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const addContributor = useMutation(api.contributors.add);

  const resetForm = () => {
    setName("");
    setPhone("");
    setDailyAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !dailyAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await addContributor({
        name,
        phone,
        dailyAmount: Number(dailyAmount),
      });
      toast.success(`${name} added as contributor`);
      setOpen(false);
      resetForm();
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to add contributor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Contributor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            Add New Contributor
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contributor-name">Full Name</Label>
            <Input
              id="contributor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adesola Johnson"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributor-phone">Phone Number</Label>
            <Input
              id="contributor-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributor-amount">
              Daily Contribution (₦)
            </Label>
            <Input
              id="contributor-amount"
              type="number"
              value={dailyAmount}
              onChange={(e) => setDailyAmount(e.target.value)}
              placeholder="500"
              required
              min="1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Contributor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
