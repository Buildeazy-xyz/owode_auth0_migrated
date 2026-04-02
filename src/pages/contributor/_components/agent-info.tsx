import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { User, Phone, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";

type Frequency = "daily" | "weekly" | "monthly";

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function AgentInfo() {
  const profile = useQuery(api.contributors.getMyProfile);

  if (profile === undefined) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }
  if (!profile) return null;

  const freq: Frequency = (profile.frequency as Frequency) ?? "daily";

  let scheduleDetail = FREQUENCY_LABELS[freq];
  if (freq === "weekly" && profile.weeklyDay !== undefined) {
    scheduleDetail = `Every ${WEEKDAY_LABELS[profile.weeklyDay]}`;
  } else if (freq === "monthly" && profile.monthlyDay !== undefined) {
    scheduleDetail = `Every ${profile.monthlyDay}${getOrdinalSuffix(profile.monthlyDay)} of the month`;
  }

  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Agent info */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
            Your Agent
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {profile.agentName}
              </p>
              {profile.agentPhone && (
                <a
                  href={`tel:${profile.agentPhone}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Phone className="w-3 h-3" />
                  {profile.agentPhone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Schedule info */}
        <div className="pt-3 border-t">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Your Schedule
          </p>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm">{scheduleDetail}</span>
            <Badge variant="secondary" className="text-[10px]">
              ₦{profile.dailyAmount.toLocaleString()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
