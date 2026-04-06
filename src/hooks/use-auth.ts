import { useMemo } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";

export function useAuth() {
  const auth = useOidcAuth();

  return useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading || auth.activeNavigator === "signinRedirect",
      error: auth.error ?? null,
      user: auth.user ?? null,
      signinRedirect: () =>
        auth.signinRedirect({
          redirect_uri: new URL(
            "/auth/callback",
            window.location.origin,
          ).toString(),
        }),
      removeUser: () =>
        auth.signoutRedirect({
          post_logout_redirect_uri: window.location.origin,
        }),
    }),
    [auth],
  );
}

export function useUser() {
  const auth = useOidcAuth();

  return useMemo(
    () => ({
      user: auth.user ?? null,
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      error: auth.error ?? null,
    }),
    [auth],
  );
}
