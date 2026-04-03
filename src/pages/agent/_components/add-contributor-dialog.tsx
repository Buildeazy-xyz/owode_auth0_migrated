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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { UserPlus, CalendarClock, Mail } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type Frequency = "daily" | "weekly" | "monthly";

const FREQUENCY_OPTIONS: { value: Frequency; label: string; amountLabel: string }[] = [
  { value: "daily", label: "Daily", amountLabel: "Daily Amount" },
  { value: "weekly", label: "Weekly", amountLabel: "Weekly Amount" },
  { value: "monthly", label: "Monthly", amountLabel: "Monthly Amount" },
];

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function AddContributorDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+234");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [weeklyDay, setWeeklyDay] = useState("1"); // Monday default
  const [monthlyDay, setMonthlyDay] = useState("1");
  const [loading, setLoading] = useState(false);

  const addContributor = useMutation(api.contributors.add);

  const resetForm = () => {
    setName("");
    setPhone("+234");
    setEmail("");
    setAmount("");
    setFrequency("daily");
    setWeeklyDay("1");
    setMonthlyDay("1");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await addContributor({
        name,
        phone,
        email: email.trim() || undefined,
        dailyAmount: Number(amount),
        frequency,
        weeklyDay: frequency === "weekly" ? Number(weeklyDay) : undefined,
        monthlyDay: frequency === "monthly" ? Number(monthlyDay) : undefined,
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

  const currentFrequency = FREQUENCY_OPTIONS.find((f) => f.value === frequency);

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
            <PhoneInput
              id="contributor-phone"
              value={phone}
              onChange={setPhone}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributor-email" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="contributor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
            />
            <p className="text-xs text-muted-foreground">
              If provided, the contributor will receive email notifications for collections and updates.
            </p>
          </div>

          {/* Contribution frequency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Contribution Frequency
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`rounded-lg border-2 py-2.5 px-3 text-sm font-medium transition-all ${
                    frequency === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly day picker */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Collection Day</Label>
              <Select value={weeklyDay} onValueChange={setWeeklyDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Which day of the week should contributions be collected?
              </p>
            </div>
          )}

          {/* Monthly day picker */}
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="monthly-day">Collection Day of Month</Label>
              <Select value={monthlyDay} onValueChange={setMonthlyDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => {
                    const day = (i + 1).toString();
                    const suffix = getOrdinalSuffix(i + 1);
                    return (
                      <SelectItem key={day} value={day}>
                        {i + 1}{suffix}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Which day of the month? (1-28 to avoid month-length issues)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contributor-amount">
              {currentFrequency?.amountLabel ?? "Amount"} ({"\u20A6"})
            </Label>
            <Input
              id="contributor-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={frequency === "daily" ? "500" : frequency === "weekly" ? "3,000" : "10,000"}
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

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
