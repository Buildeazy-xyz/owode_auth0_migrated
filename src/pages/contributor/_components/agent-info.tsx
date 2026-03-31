import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { User, Phone } from "lucide-react";

export default function AgentInfo() {
  const profile = useQuery(api.contributors.getMyProfile);

  if (profile === undefined) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }
  if (!profile) return null;

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
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
      </CardContent>
    </Card>
  );
}
