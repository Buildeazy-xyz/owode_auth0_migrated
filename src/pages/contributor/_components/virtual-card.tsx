import { format } from "date-fns";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

type Frequency = "daily" | "weekly" | "monthly";

type VirtualCardProps = {
  frequency: Frequency;
  contributionAmount: number;
  daysInMonth: number;
  currentDay: number;
  paidDays: number[];
  periodTotal: number;
  periodTarget: number;
  // Weekly-specific
  paidWeeks?: number[];
  weeksInPeriod?: number;
  currentWeek?: number;
  weeklyDay?: number;
  // Monthly-specific
  paidMonths?: number[];
  currentMonth?: number;
  monthlyDay?: number;
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FREQUENCY_PERIOD: Record<Frequency, string> = {
  daily: "/day",
  weekly: "/week",
  monthly: "/month",
};

export default function VirtualCard({
  frequency,
  contributionAmount,
  daysInMonth,
  currentDay,
  paidDays,
  periodTotal,
  periodTarget,
  paidWeeks,
  weeksInPeriod,
  currentWeek,
  weeklyDay,
  paidMonths,
  currentMonth,
  monthlyDay,
}: VirtualCardProps) {
  const paidDaySet = new Set(paidDays);
  const now = new Date();
  const monthName = format(now, "MMMM yyyy");
  const yearLabel = now.getFullYear().toString();
  const progressPercent = periodTarget > 0 ? (periodTotal / periodTarget) * 100 : 0;

  const periodLabel =
    frequency === "daily"
      ? monthName
      : frequency === "weekly"
        ? monthName
        : yearLabel;

  const scheduleNote =
    frequency === "weekly" && weeklyDay !== undefined
      ? `Every ${WEEKDAY_SHORT[weeklyDay]}`
      : frequency === "monthly" && monthlyDay !== undefined
        ? `Every ${monthlyDay}${getOrdinalSuffix(monthlyDay)}`
        : "";

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
          ₦{periodTotal.toLocaleString()}
        </p>
        <p className="text-xs opacity-80 mt-1">
          of ₦{periodTarget.toLocaleString()} target
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-foreground/80 transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] opacity-70">
          <span>{periodLabel}</span>
          <span className="flex items-center gap-1.5">
            {scheduleNote && (
              <span className="border border-primary-foreground/30 rounded px-1.5 py-0.5">
                {scheduleNote}
              </span>
            )}
            <span>₦{contributionAmount.toLocaleString()}{FREQUENCY_PERIOD[frequency]}</span>
          </span>
        </div>
      </div>

      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {frequency === "daily"
            ? "Daily Stamps"
            : frequency === "weekly"
              ? "Weekly Stamps"
              : "Monthly Stamps"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {frequency === "daily" && (
          <DailyGrid
            daysInMonth={daysInMonth}
            currentDay={currentDay}
            paidDays={paidDaySet}
          />
        )}
        {frequency === "weekly" && (
          <WeeklyGrid
            weeksInPeriod={weeksInPeriod ?? 4}
            currentWeek={currentWeek ?? 1}
            paidWeeks={new Set(paidWeeks ?? [])}
            weeklyDay={weeklyDay ?? 1}
          />
        )}
        {frequency === "monthly" && (
          <MonthlyGrid
            currentMonth={currentMonth ?? 0}
            paidMonths={new Set(paidMonths ?? [])}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Daily grid (existing) ──────────────────────────────────────────

function DailyGrid({
  daysInMonth,
  currentDay,
  paidDays,
}: {
  daysInMonth: number;
  currentDay: number;
  paidDays: Set<number>;
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isPaid = paidDays.has(day);
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
      <StampLegend />
    </>
  );
}

// ─── Weekly grid ────────────────────────────────────────────────────

function WeeklyGrid({
  weeksInPeriod,
  currentWeek,
  paidWeeks,
  weeklyDay,
}: {
  weeksInPeriod: number;
  currentWeek: number;
  paidWeeks: Set<number>;
  weeklyDay: number;
}) {
  return (
    <>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: weeksInPeriod }, (_, i) => {
          const week = i + 1;
          const isPaid = paidWeeks.has(week);
          const isCurrent = week === currentWeek;
          const isFuture = week > currentWeek;

          return (
            <button
              key={week}
              className={`
                rounded-xl flex flex-col items-center justify-center py-4 px-2
                text-sm font-medium transition-all border-2
                ${
                  isPaid
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : isCurrent
                      ? "bg-accent border-primary/50 text-foreground ring-2 ring-primary/30"
                      : isFuture
                        ? "bg-muted/30 border-border/50 text-muted-foreground/50"
                        : "bg-muted/50 border-border text-muted-foreground"
                }
              `}
              disabled
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                Week
              </span>
              <span className="text-lg font-bold font-serif">{week}</span>
              {isPaid && (
                <Check className="w-4 h-4 mt-1 text-primary" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Collection day: {WEEKDAY_SHORT[weeklyDay]}
      </p>
      <StampLegend />
    </>
  );
}

// ─── Monthly grid ───────────────────────────────────────────────────

function MonthlyGrid({
  currentMonth,
  paidMonths,
}: {
  currentMonth: number;
  paidMonths: Set<number>;
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {MONTH_SHORT.map((label, i) => {
          const isPaid = paidMonths.has(i);
          const isCurrent = i === currentMonth;
          const isFuture = i > currentMonth;

          return (
            <button
              key={label}
              className={`
                rounded-xl flex flex-col items-center justify-center py-3.5 px-2
                text-sm font-medium transition-all border-2
                ${
                  isPaid
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : isCurrent
                      ? "bg-accent border-primary/50 text-foreground ring-2 ring-primary/30"
                      : isFuture
                        ? "bg-muted/30 border-border/50 text-muted-foreground/50"
                        : "bg-muted/50 border-border text-muted-foreground"
                }
              `}
              disabled
            >
              <span className="font-serif font-bold">{label}</span>
              {isPaid && (
                <Check className="w-3.5 h-3.5 mt-0.5 text-primary" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
      <StampLegend />
    </>
  );
}

// ─── Shared legend ──────────────────────────────────────────────────

function StampLegend() {
  return (
    <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-primary/10 border border-primary/30" />
        Paid
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-accent border border-primary/50 ring-2 ring-primary/30" />
        Current
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-muted/50 border border-border" />
        Missed
      </span>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
