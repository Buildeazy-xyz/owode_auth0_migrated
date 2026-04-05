import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  ClipboardCheck,
  Wallet,
  ArrowLeft,
  Upload,
  FileCheck,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { PhoneInput } from "@/components/ui/phone-input.tsx";

type Step =
  | "choose"
  | "contributor-phone"
  | "agent-details"
  | "agent-id-upload"
  | "agent-guarantor";

function OnboardingContent() {
  const user = useQuery(api.users.getCurrentUser);
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const setRole = useMutation(api.users.setRole);
  const claimAccount = useMutation(api.contributors.claimAccount);
  const submitVerification = useMutation(api.agentVerification.submit);
  const generateUploadUrl = useMutation(
    api.agentVerification.generateUploadUrl,
  );
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);

  // Contributor claim
  const [phone, setPhone] = useState("+234");

  // Agent registration fields
  const [agentPhone, setAgentPhone] = useState("+234");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("+234");
  const [guarantorAddress, setGuarantorAddress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user !== null) return;

    void updateCurrentUser().catch((error) => {
      console.error("Failed to create current user during onboarding:", error);
    });
  }, [updateCurrentUser, user]);

  const bypassVerification = !!(user?.role === "admin" || user?.isSuperAdmin);

  // Redirect if user must verify first or already has a role
  useEffect(() => {
    if (!user) return;

    if (!bypassVerification && !(user.isVerified ?? false)) {
      navigate("/verify-account", { replace: true });
      return;
    }

    if (user.role === "admin" || user.isSuperAdmin) {
      navigate("/admin", { replace: true });
    } else if (user.role === "agent") {
      // If agent but pending/under_review, show the agent dashboard (it'll handle the gate)
      navigate("/agent", { replace: true });
    } else if (user.role === "contributor") {
      navigate("/contributor", { replace: true });
    }
  }, [bypassVerification, user, navigate]);

  if (
    user === undefined ||
    user === null ||
    (!bypassVerification && !(user.isVerified ?? false))
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  // ─── Handlers ───────────────────────────────────────────────────

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

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPhone || !idFile || !guarantorName || !guarantorPhone || !guarantorAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Upload the ID document
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": idFile.type },
        body: idFile,
      });
      const { storageId } = (await uploadResult.json()) as {
        storageId: string;
      };

      // Step 2: Submit the verification
      await submitVerification({
        phone: agentPhone,
        govIdStorageId: storageId as never,
        guarantorName,
        guarantorPhone,
        guarantorAddress,
      });

      toast.success(
        "Application submitted! You'll be notified once an admin reviews it.",
      );
      navigate("/agent", { replace: true });
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to submit application. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Step titles ────────────────────────────────────────────────

  const stepTitle: Record<Step, string> = {
    choose: "Welcome to OWODE",
    "contributor-phone": "Link Your Account",
    "agent-details": "Agent Registration — Step 1 of 3",
    "agent-id-upload": "Agent Registration — Step 2 of 3",
    "agent-guarantor": "Agent Registration — Step 3 of 3",
  };

  const stepDescription: Record<Step, string> = {
    choose: "How will you be using OWODE?",
    "contributor-phone":
      "Enter the phone number your agent registered you with.",
    "agent-details": "Enter your phone number to get started.",
    "agent-id-upload": "Upload a government-issued ID for verification.",
    "agent-guarantor": "Provide your guarantor's details.",
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div>
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-2xl font-serif">
              O
            </span>
          </div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">
            {stepTitle[step]}
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            {stepDescription[step]}
          </p>
        </div>

        {/* Role selection — only Agent and Contributor (admin is assigned by super admin) */}
        {step === "choose" && (
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <Card
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
              onClick={() => setStep("agent-details")}
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
                <Button variant="secondary" className="w-full">
                  Apply as Agent
                </Button>
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
        )}

        {/* Contributor phone claim */}
        {step === "contributor-phone" && (
          <div className="max-w-sm mx-auto space-y-6">
            <form onSubmit={handleClaimContributor} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="claim-phone">Phone Number</Label>
                <PhoneInput
                  id="claim-phone"
                  value={phone}
                  onChange={setPhone}
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
            <BackButton onClick={() => setStep("choose")} />
          </div>
        )}

        {/* Agent step 1: Phone */}
        {step === "agent-details" && (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="agent-phone" className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <PhoneInput
                  id="agent-phone"
                  value={agentPhone}
                  onChange={setAgentPhone}
                  required
                  autoFocus
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!agentPhone.trim()}
              onClick={() => setStep("agent-id-upload")}
            >
              Next — Upload ID
            </Button>
            <BackButton onClick={() => setStep("choose")} />
          </div>
        )}

        {/* Agent step 2: ID upload */}
        {step === "agent-id-upload" && (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="space-y-4 text-left">
              <Label className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                Government-Issued ID
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  idFile
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                />
                {idFile ? (
                  <div className="space-y-2">
                    <FileCheck className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm font-medium truncate">{idFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Click to change file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">
                      Click to upload your ID
                    </p>
                    <p className="text-xs text-muted-foreground">
                      NIN slip, Voter's card, Driver's license, or Passport
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!idFile}
              onClick={() => setStep("agent-guarantor")}
            >
              Next — Guarantor Details
            </Button>
            <BackButton onClick={() => setStep("agent-details")} />
          </div>
        )}

        {/* Agent step 3: Guarantor */}
        {step === "agent-guarantor" && (
          <div className="max-w-sm mx-auto space-y-6">
            <form onSubmit={handleAgentSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="g-name" className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  Guarantor Full Name
                </Label>
                <Input
                  id="g-name"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  placeholder="Adesola Johnson"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-phone" className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  Guarantor Phone
                </Label>
                <PhoneInput
                  id="g-phone"
                  value={guarantorPhone}
                  onChange={setGuarantorPhone}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-address" className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Guarantor Address
                </Label>
                <Textarea
                  id="g-address"
                  value={guarantorAddress}
                  onChange={(e) => setGuarantorAddress(e.target.value)}
                  placeholder="12 Broad Street, Lagos Island, Lagos"
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
            <BackButton onClick={() => setStep("agent-id-upload")} />
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="gap-2" onClick={onClick}>
      <ArrowLeft className="w-4 h-4" />
      Back
    </Button>
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
