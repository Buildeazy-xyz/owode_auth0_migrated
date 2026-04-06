import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

function getNextRoute(role?: "admin" | "agent" | "contributor") {
  if (role === "admin") return "/admin";
  if (role === "agent") return "/agent";
  if (role === "contributor") return "/contributor";
  return "/onboarding";
}

function VerifyAccountContent() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getCurrentUser);
  const verification = useQuery(
    api.users.getVerificationStatus,
    user ? {} : "skip",
  );
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const sendVerificationCode = useMutation(api.users.sendVerificationCode);
  const verifyAccountCode = useMutation(api.users.verifyAccountCode);

  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("+234");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const needsPhone = !user?.phone?.trim();
  const hasValidPhone = phone.replace(/\D/g, "").length >= 10;

  useEffect(() => {
    if (user !== null) return;

    void updateCurrentUser().catch((error) => {
      console.error("Failed to provision current user for verification:", error);
    });
  }, [updateCurrentUser, user]);

  useEffect(() => {
    if (!user || !(user.isVerified ?? false)) {
      return;
    }

    navigate(getNextRoute(user.role), { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (user?.phone && phone === "+234") {
      setPhone(user.phone);
    }
  }, [phone, user?.phone]);

  const requestVerificationCode = async (showSuccessToast = true) => {
    const trimmedPhone = phone.trim();

    if (needsPhone && !hasValidPhone) {
      toast.error("Enter a valid phone number first so we can text your verification code.");
      return;
    }

    setIsSending(true);
    try {
      await sendVerificationCode({
        phone: needsPhone ? trimmedPhone : undefined,
      });
      if (showSuccessToast) {
        toast.success("Verification code sent", {
          description: "Check your email or SMS inbox for the 6-digit code.",
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof ConvexError
          ? String((error.data as { message?: string })?.message ?? "")
          : error instanceof Error
            ? error.message
            : "Could not send a verification code.";

      toast.error("Could not send verification code", {
        description: message,
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!verification || !user || verification.isVerified || autoSent || isSending || needsPhone) {
      return;
    }

    setAutoSent(true);
    void requestVerificationCode(false);
  }, [autoSent, isSending, needsPhone, user, verification]);

  const deliverySummary = useMemo(() => {
    if (!verification) return "";

    if (needsPhone) {
      return "Add your phone number so every new account receives its verification code by SMS and email.";
    }

    const targets = [verification.maskedEmail, verification.maskedPhone].filter(
      Boolean,
    );

    if (targets.length === 0) {
      return "No email or phone number is currently available for verification.";
    }

    return `We sent a 6-digit verification code to ${targets.join(" and ")}.`;
  }, [needsPhone, verification]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Enter the 6-digit code first.");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyAccountCode({ code: code.trim() });
      toast.success("Account verified successfully.");
      navigate(getNextRoute(user?.role), { replace: true });
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String((error.data as { message?: string })?.message ?? "")
          : error instanceof Error
            ? error.message
            : "Verification failed. Please try again.";

      toast.error("Verification failed", { description: message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    await requestVerificationCode(true);
  };

  if (user === undefined || verification === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-serif">Verify your account</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{deliverySummary}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="rounded-lg border p-3 flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <span>Email delivery enabled</span>
            </div>
            <div className="rounded-lg border p-3 flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <span>SMS delivery enabled</span>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {needsPhone && (
              <div className="space-y-2">
                <Label htmlFor="verification-phone">Phone number</Label>
                <PhoneInput
                  id="verification-phone"
                  value={phone}
                  onChange={setPhone}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We require a phone number so new users always receive their verification code by SMS.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification code</Label>
              <Input
                id="verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(event) => {
                  const normalized = event.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(normalized);
                }}
                maxLength={6}
                autoFocus={!needsPhone}
              />
              <p className="text-xs text-muted-foreground">
                Enter the code you received to finish creating your account.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify account"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isSending || (needsPhone && !hasValidPhone)}
          >
            {isSending
              ? "Sending..."
              : needsPhone
                ? "Save phone & send code"
                : "Resend code"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyAccountPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
          <h1 className="text-2xl font-bold font-serif">Sign in to verify your account</h1>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <VerifyAccountContent />
      </Authenticated>
    </>
  );
}
