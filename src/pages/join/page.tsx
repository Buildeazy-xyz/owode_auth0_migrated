import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { api } from '@/convex/_generated/api.js';
import { Spinner } from '@/components/ui/spinner.tsx';
import { SignInButton } from '@/components/ui/signin.tsx';

function Claiming({ token }: { token: string }) {
  const claim = useMutation(api.contributors.claimByToken);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    claim({ token })
      .then(() => {
        if (!cancelled) navigate('/contributor', { replace: true });
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.data?.message ?? 'We could not set up your account.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [claim, navigate, token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

export default function JoinPage() {
  const { token } = useParams();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">This link is not valid.</p>
      </div>
    );
  }

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
          <div>
            <h1 className="text-2xl font-bold font-serif">Your OWODE account is ready</h1>
            <p className="mt-2 text-muted-foreground">
              Create a password to see your card and savings.
            </p>
          </div>
          <SignInButton signInText="Continue" showIcon={false} authMode="signup" />
        </div>
      </Unauthenticated>
      <Authenticated>
        <Claiming token={token} />
      </Authenticated>
    </>
  );
}
