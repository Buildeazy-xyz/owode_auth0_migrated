# Owode Auth0 Migration Notes

## What changed
- Removed Hercules build/auth packages.
- Replaced the frontend auth provider with `react-oidc-context` configured for Auth0.
- Replaced the Convex Hercules bridge with the generic `ConvexProviderWithAuth`.
- Replaced Hercules email sending with an HTTP integration that supports Mailgun and can fall back to Resend.

## What you need to configure in Auth0
- Application type: Single Page Application
- Allowed Callback URLs: `http://localhost:5173/auth/callback`
- Allowed Logout URLs: `http://localhost:5173`
- Allowed Web Origins: `http://localhost:5173`

For production, add your live URLs too.

## Environment variables
Copy `.env.example` to `.env.local` or your deployment environment and fill in:
- `VITE_CONVEX_URL`
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`

Optional:
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_FROM_EMAIL` or `SENDER_EMAIL`
- `RESEND_API_KEY` (only if you prefer Resend as a fallback)
- Twilio credentials

## Notes
- The Convex provider currently passes the OIDC `id_token` to Convex. This is the simplest migration path for Auth0 + Convex OIDC.
- Email sending now prefers Mailgun if configured, can fall back to Resend, and otherwise logs/skips instead of crashing.
- This patch does not yet add yearly savings, loans, Providus integration, or fintech-grade audit logs.
