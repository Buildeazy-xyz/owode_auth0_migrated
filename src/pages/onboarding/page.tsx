import { useNavigate } from "react-router-dom";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useMutation,
} from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { ClipboardCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

function OnboardingContent() {
  const user = useQuery(api.users.getCurrentUser);
  const setRole = useMutation(api.users.setRole);
  const navigate = useNavigate();

  // If user already has a role, redirect to appropriate dashboard
  useEffect(() => {
    if (user?.role === "agent") {
      navigate("/agent", { replace: true });
    }
  }, [user, navigate]);

  if (user === undefined || user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  const handleSelectRole = async (role: "agent" | "contributor") => {
    if (role === "contributor") {
      toast.info("Contributor dashboard coming soon in a future milestone!");
      return;
    }
    try {
      await setRole({ role });
      toast.success("Welcome aboard, Agent!");
      navigate("/agent", { replace: true });
    } catch {
      toast.error("Failed to set role. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-2xl font-serif">
              O
            </span>
          </div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">
            Welcome to OWODE
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            How will you be using OWODE?
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            onClick={() => handleSelectRole("agent")}
          >
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{"I'm an Agent"}</h3>
              <p className="text-sm text-muted-foreground">
                I collect contributions from members and need to record them
                digitally.
              </p>
              <Button className="w-full">Continue as Agent</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-accent/40 hover:shadow-md transition-all"
            onClick={() => handleSelectRole("contributor")}
          >
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto">
                <Wallet className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{"I'm a Contributor"}</h3>
              <p className="text-sm text-muted-foreground">
                I make regular contributions and want to track my virtual card
                and alerts.
              </p>
              <Button variant="secondary" className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
          <h1 className="text-2xl font-bold font-serif">
            Sign in to get started
          </h1>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <OnboardingContent />
      </Authenticated>
    </>
  );
}
