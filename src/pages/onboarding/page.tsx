import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { ClipboardCheck, Wallet, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

function OnboardingContent() {
  const user = useQuery(api.users.getCurrentUser);
  const setRole = useMutation(api.users.setRole);
  const claimAccount = useMutation(api.contributors.claimAccount);
  const navigate = useNavigate();

  const [step, setStep] = useState<"choose" | "contributor-phone">("choose");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // If user already has a role, redirect to appropriate dashboard
  useEffect(() => {
    if (user?.role === "agent") {
      navigate("/agent", { replace: true });
    } else if (user?.role === "contributor") {
      navigate("/contributor", { replace: true });
    }
  }, [user, navigate]);

  if (user === undefined || user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  const handleSelectAgent = async () => {
    try {
      await setRole({ role: "agent" });
      toast.success("Welcome aboard, Agent!");
      navigate("/agent", { replace: true });
    } catch {
      toast.error("Failed to set role. Please try again.");
    }
  };

  const handleClaimContributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    setLoading(true);
    try {
      await claimAccount({ phone: phone.trim() });
      toast.success("Account linked! Welcome to OWODE.");
      navigate("/contributor", { replace: true });
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to link account. Please try again.");
      }
    } finally {
      setLoading(false);
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
            {step === "choose"
              ? "Welcome to OWODE"
              : "Link Your Account"}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            {step === "choose"
              ? "How will you be using OWODE?"
              : "Enter the phone number your agent registered you with."}
          </p>
        </div>

        {step === "choose" ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
              onClick={handleSelectAgent}
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
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
              onClick={() => setStep("contributor-phone")}
            >
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto">
                  <Wallet className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-lg">
                  {"I'm a Contributor"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  I make regular contributions and want to track my virtual card
                  and payments.
                </p>
                <Button variant="secondary" className="w-full">
                  Continue as Contributor
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-sm mx-auto space-y-6">
            <form onSubmit={handleClaimContributor} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="claim-phone">Phone Number</Label>
                <Input
                  id="claim-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08012345678"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This must match the number your agent used when adding you.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Linking..." : "Link My Account"}
              </Button>
            </form>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setStep("choose")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        )}
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
