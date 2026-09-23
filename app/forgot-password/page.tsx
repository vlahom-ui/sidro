import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-8">
      <Link href="/" className="text-2xl lowercase font-bold text-navy">
        sidro
      </Link>
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2">Zaboravljena lozinka</h1>
        <p className="text-sm opacity-70 mb-6">
          Unesite email adresu vašeg računa i poslat ćemo vam poveznicu za postavljanje nove lozinke.
        </p>
        <ForgotPasswordForm />
        <p className="text-sm mt-6">
          <Link href="/login" className="text-slate underline">
            ← Natrag na prijavu
          </Link>
        </p>
      </div>
    </main>
  );
}
