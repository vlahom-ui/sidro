import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { DashboardHeader } from "@/components/DashboardHeader";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen">
      <DashboardHeader email={user.email ?? ""} />
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-6">Postavke računa</h1>
        <p className="text-sm mb-6">{user.email}</p>
        <ChangePasswordForm email={user.email ?? ""} />

        <hr className="border-navy/10 my-10" />

        <h2 className="font-bold mb-3">Brisanje računa</h2>
        <DeleteAccountForm />
      </div>
    </main>
  );
}
