import "server-only";

import {
  Resend,
} from "resend";

/* =========================================================
   RESEND CLIENT
========================================================= */

let resendClient:
  Resend | null =
  null;

export function getResendClient() {
  const apiKey =
    process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  if (!resendClient) {
    resendClient =
      new Resend(
        apiKey
      );
  }

  return resendClient;
}

/* =========================================================
   FROM ADDRESS
========================================================= */

export function getResendFromEmail() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL is not configured."
    );
  }

  return fromEmail;
}

/* =========================================================
   SITE URL
========================================================= */

export function getSiteUrl() {
  const url =
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    "https://blizkits.vercel.app";

  return url.replace(
    /\/+$/,
    ""
  );
}