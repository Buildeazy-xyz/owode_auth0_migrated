import { useEffect, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { api } from "@/convex/_generated/api.js";

export default function CallbackPage() {
  const auth = useAuth();
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } =
    useConvexAuth();
  const navigate = useNavigate();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [showTimeoutHelp, setShowTimeoutHelp] = useState(false);

  useEffect(() => {
    const isStillWaitingForAuth =
      auth.isLoading ||
      isConvexLoading ||
      (auth.isAuthenticated && !isConvexAuthenticated);

    if (!isStillWaitingForAuth) {
      setShowTimeoutHelp(false);
      return;
    }

    setShowTimeoutHelp(false);
    const timer = window.setTimeout(() => {
      setShowTimeoutHelp(true);
    }, 15000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    isConvexAuthenticated,
    isConvexLoading,
  ]);

  useEffect(() => {
    if (auth.error) {
      console.error("OIDC callback error:", auth.error);
      return;
    }

    if (showTimeoutHelp && auth.isAuthenticated && !isConvexAuthenticated) {
      setSetupError(
        "We could not finish signing you in. Please return home and sign in again. If it still hangs, refresh once and retry.",
      );
      return;
    }

    if (auth.isLoading || isConvexLoading || isProvisioning || setupError) {
      return;
    }

    if (!auth.isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    if (!isConvexAuthenticated) {
      return;
    }

    setIsProvisioning(true);
    setSetupError(null);

    void updateCurrentUser()
      .then(() => {
        navigate("/verify-account", { replace: true });
      })
      .catch((error: unknown) => {
        console.error("Failed to finish sign-in:", error);
        setSetupError(
          error instanceof Error
            ? error.message
            : "We could not finish setting up your account.",
        );
      })
      .finally(() => {
        setIsProvisioning(false);
      });
  }, [
    auth.error,
    auth.isAuthenticated,
    auth.isLoading,
    isConvexAuthenticated,
    isConvexLoading,
    isProvisioning,
    navigate,
    setupError,
    showTimeoutHelp,
    updateCurrentUser,
  ]);

  if (auth.error || setupError) {
    const message = auth.error?.message?.includes(
      "No matching state found in storage",
    )
      ? "Your sign-in session expired or was started from a different localhost port. Return home, open the current app URL, and click Sign In again."
      : auth.error?.message?.includes("invalid refresh token") ||
          auth.error?.message?.includes("Unknown or invalid refresh token")
        ? "Auth0 rejected the saved refresh token. Return home and click Sign In again to start a fresh session."
        : auth.error?.message ?? setupError;

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Sign-in failed</h1>
          <p className="mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <button
              className="px-4 py-2 rounded bg-black text-white"
              onClick={() => navigate("/", { replace: true })}
            >
              Return home
            </button>
            <button
              className="px-4 py-2 rounded border"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          {isProvisioning ? "Setting up your account..." : "Signing you in..."}
        </h1>
        <p>Please wait a moment.</p>
      </div>
    </div>
  );
}