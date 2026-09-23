import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/apiRoute";

const POLICY_VERSION = "2026-09-22";

const EMAIL_ALREADY_EXISTS_MESSAGE =
  "Račun s tom email adresom već postoji. Pokušajte se prijaviti ili zatražite novi link za potvrdu.";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  turnstileToken: z.string().min(1),
  consent: z.literal(true),
});

export const POST = withErrorHandling(async (request: Request) => {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Nevažeći podaci." }, { status: 400 });
  }

  const { email, password, turnstileToken } = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip ?? undefined);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Sigurnosna provjera nije uspjela. Pokušajte ponovno." }, { status: 400 });
  }

  const supabase = await createClient();

  // Provjeri postoji li već račun s ovim emailom PRIJE signUp() poziva.
  // signUp() namjerno vraća identičan (obfuscated) 200 odgovor i za nov
  // signup i za ponovljenu registraciju nepotvrđenog korisnika — GoTrue to
  // radi svjesno radi sprječavanja enumeracije korisnika, pa se iz samog
  // signUp() odgovora ne može pouzdano razlikovati "nov korisnik" od
  // "email već postoji, ali nije potvrđen". email_has_account SQL funkcija
  // (SECURITY DEFINER nad auth.users) daje pouzdan odgovor neovisno o
  // statusu potvrde.
  const { data: emailExists, error: emailCheckError } = await supabase.rpc("email_has_account", {
    p_email: email,
  });

  if (!emailCheckError && emailExists) {
    await logAudit({ action: "register", outcome: "failure", details: "email already has an account" });
    return NextResponse.json({ error: EMAIL_ALREADY_EXISTS_MESSAGE }, { status: 409 });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error || !data.user) {
    await logAudit({ action: "register", outcome: "failure", details: error?.message });
    return NextResponse.json(
      { error: "Registracija nije uspjela. Provjerite podatke ili pokušajte s drugim emailom." },
      { status: 400 }
    );
  }

  // Fallback za rijedak race-condition prozor između provjere iznad i ovog
  // poziva: za POTVRĐEN postojeći korisnik signUp() ipak vraća prazan
  // identities[] (isti "user_repeated_signup" signal iz Supabase auth logova).
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    await logAudit({
      userId: data.user.id,
      action: "register",
      outcome: "failure",
      details: "user_repeated_signup — email already has an account",
    });
    return NextResponse.json({ error: EMAIL_ALREADY_EXISTS_MESSAGE }, { status: 409 });
  }

  const admin = createAdminClient();
  await admin.from("consents").insert({
    user_id: data.user.id,
    policy_version: POLICY_VERSION,
    ip_address: ip,
  });

  await logAudit({ userId: data.user.id, action: "register", outcome: "success" });

  return NextResponse.json({
    ok: true,
    requiresEmailConfirmation: !data.session,
  });
});
