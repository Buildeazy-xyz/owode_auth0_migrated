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

        if (forceRefreshToken) {
          console.warn(
            "Convex requested a token refresh, but silent refresh is disabled for this Auth0 setup. Reusing the current token.",
          );
        }

        return auth.user?.access_token ?? auth.user?.id_token ?? null;
      },
    }),
    [
      auth.activeNavigator,
      auth.isAuthenticated,
      auth.isLoading,
      auth.user?.access_token,
      auth.user?.id_token,
    ],
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexOidcAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
