import { useEffect, useState } from "react";
import { Outlet, Link, Navigate, useNavigate } from "react-router-dom";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>
      <Authenticated>
        <VerifiedAppLayout />
      </Authenticated>
    </div>
  );
}

function VerifiedAppLayout() {
  const user = useQuery(api.users.getCurrentUser);
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const navigate = useNavigate();
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [hasTriedRestore, setHasTriedRestore] = useState(false);
  const bypassVerification = !!(user?.role === "admin" || user?.isSuperAdmin);

  useEffect(() => {
    if (user !== null || isRestoringSession || hasTriedRestore) {
      return;
    }

    setIsRestoringSession(true);
    setHasTriedRestore(true);

    void updateCurrentUser()
      .catch((error) => {
        console.error("Failed to restore the signed-in session:", error);
        navigate("/", { replace: true });
      })
      .finally(() => {
        setIsRestoringSession(false);
      });
  }, [hasTriedRestore, isRestoringSession, navigate, updateCurrentUser, user]);

  if (user === undefined || user === null || isRestoringSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">Restoring your session...</p>
      </div>
    );
  }

  if (!bypassVerification && !(user.isVerified ?? false)) {
    return <Navigate to="/verify-account" replace />;
  }

  return (
    <>
      <AppNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </>
  );
}

function AppNav() {
  const user = useQuery(api.users.getCurrentUser);

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="OWODE Financial Group"
              className="h-9 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.name || user.email || "User"}
              </span>
            ) : (
              <Skeleton className="h-4 w-20 hidden sm:block" />
            )}
            <SignInButton size="sm" variant="ghost" />
          </div>
        </div>
      </div>
    </nav>
  );
}
