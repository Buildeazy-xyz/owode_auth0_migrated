import { AuthConfig } from "convex/server";

const auth0Domain = process.env.AUTH0_DOMAIN?.startsWith("http")
  ? process.env.AUTH0_DOMAIN
  : process.env.AUTH0_DOMAIN
    ? `https://${process.env.AUTH0_DOMAIN}`
    : undefined;

export default {
  providers: auth0Domain && process.env.AUTH0_CLIENT_ID
    ? [
        {
          domain: auth0Domain,
          applicationID: process.env.AUTH0_CLIENT_ID,
        },
      ]
    : [],
} satisfies AuthConfig;
