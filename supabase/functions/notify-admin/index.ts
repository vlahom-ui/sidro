// Supabase Edge Function: šalje admin notifikaciju (Vlaho) preko Resenda
// kod svake nove registracije (auth.users insert) i kod svakog novog venues zapisa.
//
// Poziva se iz Postgres triggera preko ugrađene supabase_functions.http_request()
// funkcije (isti mehanizam koji Supabase Dashboard generira za "Database Webhooks").
// Vidi supabase/migrations/0002_admin_notifications.sql.
//
// Deploy: supabase functions deploy notify-admin
// Secrets: supabase secrets set RESEND_API_KEY=... ADMIN_NOTIFICATION_EMAIL=... RESEND_FROM_EMAIL=... APP_URL=...
// SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY su automatski dostupni edge funkcijama.

import { createClient } from "npm:@supabase/supabase-js@2";

interface WebhookPayload {
  type: "INSERT";
  table: string;
  schema: string;
  record: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  const webhookSecret = Deno.env.get("NOTIFY_ADMIN_WEBHOOK_SECRET");
  if (webhookSecret) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const payload = (await req.json()) as WebhookPayload;

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Sidro <noreply@sidroapp.com>";
  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  const appUrl = Deno.env.get("APP_URL") ?? "https://sidroapp.com";

  if (!resendApiKey || !adminEmail) {
    return new Response("Missing configuration", { status: 500 });
  }

  let subject = "";
  let html = "";

  if (payload.table === "users" && payload.schema === "auth") {
    const email = payload.record.email as string;
    const createdAt = payload.record.created_at as string;
    subject = `Sidro — nova registracija: ${email}`;
    html = `<p>Novi korisnik se registrirao na Sidru.</p>
      <p><strong>Email:</strong> ${email}<br/>
      <strong>Vrijeme:</strong> ${createdAt}</p>`;
  } else if (payload.table === "venues") {
    const venueId = payload.record.id as string;
    const naziv = payload.record.naziv as string;
    const ownerUserId = payload.record.owner_user_id as string;
    const createdAt = payload.record.created_at as string;

    let ownerEmail = ownerUserId;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data } = await admin.auth.admin.getUserById(ownerUserId);
      if (data?.user?.email) ownerEmail = data.user.email;
    }

    subject = `Sidro — novi objekt: ${naziv}`;
    html = `<p>Registriran je novi objekt na Sidru.</p>
      <p><strong>Naziv objekta:</strong> ${naziv}<br/>
      <strong>Email vlasnika:</strong> ${ownerEmail}<br/>
      <strong>Vrijeme:</strong> ${createdAt}</p>
      <p><a href="${appUrl}/dashboard/${venueId}">Pregledaj objekt</a></p>`;
  } else {
    return new Response("Ignored", { status: 200 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminEmail,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(`Resend error: ${text}`, { status: 502 });
  }

  return new Response("OK", { status: 200 });
});
