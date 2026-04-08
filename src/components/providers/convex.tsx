import { useMemo } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAuth as useOidcAuth } from "react-oidc-context";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
const convex = new ConvexReactClient(convexUrl);

function useConvexOidcAuth() {
  const auth = useOidcAuth();

  return useMemo(
    () => ({
      isLoading: auth.isLoading || Boolean(auth.activeNavigator),
      isAuthenticated: auth.isAuthenticated,
      fetchAccessToken: async ({
        forceRefreshToken,
      }: {
        forceRefreshToken: boolean;
      }) => {
        if (!auth.isAuthenticated) {
          return null;
        }

        const currentToken = auth.user?.id_token ?? auth.user?.access_token ?? null;

        if (!forceRefreshToken) {
          return currentToken;
        }

        try {
          const refreshedUser = await auth.signinSilent();
          return refreshedUser?.id_token ?? refreshedUser?.access_token ?? currentToken;
        } catch (error) {
          console.error("Unable to silently refresh the Auth0 session:", error);
          return currentToken;
        }
      },
    }),
    [auth],
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexOidcAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
