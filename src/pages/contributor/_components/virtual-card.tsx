import { format } from "date-fns";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

type VirtualCardProps = {
  daysInMonth: number;
  currentDay: number;
  paidDays: number[];
  dailyAmount: number;
  monthTotal: number;
  monthTarget: number;
};

export default function VirtualCard({
  daysInMonth,
  currentDay,
  paidDays,
  dailyAmount,
  monthTotal,
  monthTarget,
}: VirtualCardProps) {
  const paidSet = new Set(paidDays);
  const now = new Date();
  const monthName = format(now, "MMMM yyyy");
  const progressPercent = monthTarget > 0 ? (monthTotal / monthTarget) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      {/* Card header with gradient */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-6 py-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-widest opacity-80">
            Virtual Thrift Card
          </span>
          <span className="font-serif text-sm font-bold opacity-90">OWODE</span>
        </div>
        <p className="text-2xl font-bold font-serif mt-3">
          ₦{monthTotal.toLocaleString()}
        </p>
        <p className="text-xs opacity-80 mt-1">
          of ₦{monthTarget.toLocaleString()} target
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-foreground/80 transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] opacity-70">
          <span>{monthName}</span>
          <span>₦{dailyAmount.toLocaleString()}/day</span>
        </div>
      </div>

      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Daily Stamps
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {/* Day grid - mimics the traditional ajo stamp card */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isPaid = paidSet.has(day);
            const isToday = day === currentDay;
            const isFuture = day > currentDay;

            return (
              <button
                key={day}
                className={`
                  relative aspect-square rounded-lg flex flex-col items-center justify-center
                  text-xs font-medium transition-all border
                  ${
                    isPaid
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : isToday
                        ? "bg-accent border-primary/50 text-foreground ring-2 ring-primary/30"
                        : isFuture
                          ? "bg-muted/30 border-border/50 text-muted-foreground/50"
                          : "bg-muted/50 border-border text-muted-foreground"
                  }
                `}
                disabled
              >
                <span className="leading-none">{day}</span>
                {isPaid && (
                  <Check className="w-3 h-3 mt-0.5 text-primary" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary/10 border border-primary/30" />
            Paid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-accent border border-primary/50 ring-2 ring-primary/30" />
            Today
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-muted/50 border border-border" />
            Missed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
