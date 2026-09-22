"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-navy/10 px-4 py-4 flex items-center justify-between">
      <Link href="/dashboard" className="text-xl lowercase font-bold text-navy">
        sidro
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <span className="opacity-70 hidden sm:inline">{email}</span>
        <Link href="/account" className="text-slate underline">
          Račun
        </Link>
        <button onClick={handleLogout} className="text-slate underline">
          Odjava
        </button>
      </nav>
    </header>
  );
}
