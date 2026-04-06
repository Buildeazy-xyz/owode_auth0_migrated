import { Outlet, Link, Navigate } from "react-router-dom";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
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
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
          <img
            src="https://hercules-cdn.com/file_MvdcHn3Luis6KlyAOhCjHtE8"
            alt="OWODE Financial Group"
            className="h-14 w-auto"
          />
          <h1 className="text-2xl font-bold font-serif">
            Sign in to continue
          </h1>
          <p className="text-muted-foreground text-sm">
            You need to be signed in to access OWODE.
          </p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <VerifiedAppLayout />
      </Authenticated>
    </div>
  );
}

function VerifiedAppLayout() {
  const user = useQuery(api.users.getCurrentUser);

  if (user === undefined || user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!(user.isVerified ?? false)) {
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
              src="https://hercules-cdn.com/file_MvdcHn3Luis6KlyAOhCjHtE8"
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
