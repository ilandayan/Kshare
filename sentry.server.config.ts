// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  // 10% sampling in production to avoid excessive quota usage
  tracesSampleRate: 0.1,

  // Disable PII to comply with RGPD
  sendDefaultPii: false,
});
