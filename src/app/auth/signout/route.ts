import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    console.error(
      "Sign out error:",
      error
    );
  }

  /*
   * Clear any cached auth-dependent layouts/pages.
   */
  revalidatePath("/", "layout");

  /*
   * 303 is appropriate after a POST:
   * POST /auth/signout
   *      ↓
   * GET /login
   */
  return NextResponse.redirect(
    new URL(
      "/login?message=You have been signed out successfully.",
      request.url
    ),
    {
      status: 303,
    }
  );
}