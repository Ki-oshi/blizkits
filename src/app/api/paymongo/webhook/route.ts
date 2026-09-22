import crypto from "crypto";

import {
  NextResponse,
} from "next/server";

import { finalizePaidOrder } from "@/lib/orders/finalizePaidOrder";

function safeCompare(
  a: string,
  b: string
) {
  const aBuffer =
    Buffer.from(a);

  const bBuffer =
    Buffer.from(b);

  if (
    aBuffer.length !==
    bBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    aBuffer,
    bBuffer
  );
}

function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
) {
  const parts =
    Object.fromEntries(
      signatureHeader
        .split(",")
        .map((part) => {
          const [
            key,
            ...rest
          ] =
            part
              .trim()
              .split("=");

          return [
            key,
            rest.join("="),
          ];
        })
    );

  const timestamp =
    parts.t;

  const testSignature =
    parts.te;

  const liveSignature =
    parts.li;

  if (!timestamp) {
    return false;
  }

  /*
   * Test endpoints populate te.
   * Live endpoints populate li.
   */
  const suppliedSignature =
    testSignature ||
    liveSignature;

  if (
    !suppliedSignature
  ) {
    return false;
  }

  const signedPayload =
    `${timestamp}.${rawBody}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(
        signedPayload
      )
      .digest("hex");

  return safeCompare(
    expectedSignature,
    suppliedSignature
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
     * IMPORTANT:
     * Read RAW body before JSON parsing.
     */
    const rawBody =
      await request.text();

    const signatureHeader =
      request.headers.get(
        "paymongo-signature"
      );

    const webhookSecret =
      process.env
        .PAYMONGO_WEBHOOK_SECRET;

    if (
      !signatureHeader ||
      !webhookSecret
    ) {
      return NextResponse.json(
        {
          error:
            "Missing webhook signature.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !verifySignature(
        rawBody,
        signatureHeader,
        webhookSecret
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid webhook signature.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Safe to parse after signature
     * verification.
     */
    const payload =
      JSON.parse(rawBody);

    /*
     * Support PayMongo's event envelope
     * formats.
     */
    const eventType =
      payload?.data
        ?.attributes
        ?.type ??
      payload?.data?.type;

    const session =
      payload?.data
        ?.attributes
        ?.data ??
      payload?.data?.data;

    /*
     * Ignore events we don't use.
     */
    if (
      eventType !==
      "checkout_session.payment.paid"
    ) {
      return NextResponse.json({
        received: true,
      });
    }

    const referenceNumber =
      session
        ?.attributes
        ?.reference_number;

    if (!referenceNumber) {
      console.error(
        "Paid checkout webhook missing reference number."
      );

      /*
       * Still acknowledge the webhook.
       */
      return NextResponse.json({
        received: true,
      });
    }

    await finalizePaidOrder(
      referenceNumber
    );

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "PayMongo webhook error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}