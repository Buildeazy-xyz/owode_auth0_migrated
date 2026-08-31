import { Card, CardContent } from '@/components/ui/card.tsx';
import { SignInButton } from '@/components/ui/signin.tsx';
import { ClipboardCheck, Wallet } from 'lucide-react';

/**
 * Lets someone say who they are before signing in, so they are not
 * dropped into a generic login. The choice only picks the path -
 * the actual role is still decided by verification.
 */
export default function GetStartedPage() {
  const remember = (choice: string) => {
    try {
      localStorage.setItem('owode_intended_role', choice);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-serif tracking-tight">
            Welcome to OWODE
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Tell us who you are so we can take you to the right place.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="hover:border-primary/40 hover:shadow-md transition-all">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto">
                <Wallet className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg">It m a Contributor</h3>
              <p className="text-sm text-muted-foreground">
                I save with an agent and want to see my card and balance.
              </p>
              <SignInButton
                className="w-full"
                signInText="Continue as Contributor"
                showIcon={false}
                onClick={() => remember('contributor')}
              />
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 hover:shadow-md transition-all">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">It m an Agent</h3>
              <p className="text-sm text-muted-foreground">
                I collect contributions and need to record them.
              </p>
              <SignInButton
                className="w-full"
                signInText="Continue as Agent"
                showIcon={false}
                onClick={() => remember('agent')}
              />
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Agent accounts are reviewed and approved by OWODE before they can be used.
        </p>
      </div>
    </div>
  );
}
