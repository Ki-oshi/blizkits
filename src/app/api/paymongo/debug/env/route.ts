import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? "unknown",

    paymongoSecretKey: Boolean(
      process.env.PAYMONGO_SECRET_KEY
    ),

    paymongoWebhookSecret: Boolean(
      process.env.PAYMONGO_WEBHOOK_SECRET
    ),

    supabaseUrl: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),

    supabaseAnonKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),

    supabaseSecretKey: Boolean(
      process.env.SUPABASE_SECRET_KEY
    ),
  });
}