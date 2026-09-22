import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { logAudit } from "@/lib/audit";

const POLICY_VERSION = "2026-09-22";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  turnstileToken: z.string().min(1),
  consent: z.literal(true),
});

export async function POST(request: Request) {
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
}
