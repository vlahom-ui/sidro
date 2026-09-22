import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * Callback ruta za Supabase email-confirmation link (registracija,
 * password recovery, email change...). Supabase preusmjerava ovamo nakon
 * klika na link u mailu, s jednim od dva formata:
 *   - ?code=...                      (PKCE flow — exchangeCodeForSession)
 *   - ?token_hash=...&type=...       (OTP-style verify link — verifyOtp)
 * Bez ove razmjene korisnik NIJE prijavljen — samo posjedovanje koda u
 * URL-u ne stvara sesiju.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await logAudit({ action: "email_confirm", outcome: "success" });
      return NextResponse.redirect(`${origin}${next}`);
    }
    await logAudit({ action: "email_confirm", outcome: "failure", details: error.message });
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      await logAudit({ action: "email_confirm", outcome: "success" });
      return NextResponse.redirect(`${origin}${next}`);
    }
    await logAudit({ action: "email_confirm", outcome: "failure", details: error.message });
  }

  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set(
    "error",
    "Poveznica za potvrdu emaila je nevažeća ili je istekla. Pokušajte se prijaviti ili zatražite novu poveznicu."
  );
  return NextResponse.redirect(errorUrl);
}
