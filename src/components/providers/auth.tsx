import React from "react";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

function resolveAuthUrl(configuredUrl: string | undefined, fallbackPath: string) {
  const origin = window.location.origin;

  try {
    return new URL(configuredUrl || fallbackPath, origin).toString();
  } catch {
    return new URL(fallbackPath, origin).toString();
  }
}

function cleanupAuthUrlNoise() {
  const url = new URL(window.location.href);

  if (
    url.pathname !== "/auth/callback" &&
    url.searchParams.has("iss") &&
    !url.searchParams.has("code") &&
    !url.searchParams.has("state")
  ) {
    url.searchParams.delete("iss");
    const nextUrl = `${url.pathname}${url.search}${url.hash}` || "/";
    window.history.replaceState({}, document.title, nextUrl);
  }
}

const redirectUri = resolveAuthUrl(
  import.meta.env.VITE_AUTH0_REDIRECT_URI,
  "/auth/callback",
);
const postLogoutRedirectUri = resolveAuthUrl(
  import.meta.env.VITE_AUTH0_POST_LOGOUT_REDIRECT_URI,
  "/",
);

if (!auth0Domain || !auth0ClientId) {
  console.warn(
    "Auth0 configuration is missing. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your environment."
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authority = auth0Domain?.startsWith("http")
    ? auth0Domain
    : auth0Domain
      ? `https://${auth0Domain}`
      : "";

  React.useEffect(() => {
    cleanupAuthUrlNoise();
  }, []);

  if (!authority || !auth0ClientId) {
    return <>{children}</>;
  }

  return (
    <OidcAuthProvider
      authority={authority}
      client_id={auth0ClientId}
      redirect_uri={redirectUri}
      post_logout_redirect_uri={postLogoutRedirectUri}
      scope={
        import.meta.env.VITE_AUTH0_SCOPE ??
        "openid profile email offline_access"
      }
      response_type={import.meta.env.VITE_AUTH0_RESPONSE_TYPE ?? "code"}
      automaticSilentRenew={false}
      monitorSession={false}
      metadata={{
        issuer: authority,
        authorization_endpoint: `${authority}/authorize`,
        token_endpoint: `${authority}/oauth/token`,
        userinfo_endpoint: `${authority}/userinfo`,
        end_session_endpoint: `${authority}/v2/logout`,
        jwks_uri: `${authority}/.well-known/jwks.json`,
      }}
      onSigninCallback={() => {
        const nextPath = "/auth/callback";
        window.history.replaceState({}, document.title, nextPath);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
    >
      {children}
    </OidcAuthProvider>
  );
}