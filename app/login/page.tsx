import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-8">
      <Link href="/" className="text-2xl lowercase font-bold text-navy">
        sidro
      </Link>
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6">Prijava</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-sm mt-6">
          Nemate račun?{" "}
          <Link href="/register" className="text-slate underline">
            Registrirajte se
          </Link>
        </p>
      </div>
    </main>
  );
}
