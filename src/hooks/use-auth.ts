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
      signinRedirect: (mode: "signin" | "signup" = "signin") =>
        auth.signinRedirect({
          prompt: "login",
          extraQueryParams:
            mode === "signup" ? { screen_hint: "signup" } : undefined,
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
